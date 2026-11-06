import type { ChannelAdapter } from "../adapters/types";
import { FatalApiError, isRetryable, type Api } from "../api";
import { inSendWindow, isActiveDay, type Sleep } from "../timing";
import { runChannel, type RunnerState } from "../runner";
import type { SocialChannel } from "../types";
import { discoverChannel } from "./discover";
import { runInbox } from "./inbox";

export const EXIT = { OK: 0, ERROR: 1, HALT: 2, LOCKED: 3, AUTH: 4 } as const;

export interface ImapReplies {
  replies: { email: string; body: string }[];
  commit: () => void;
}

export interface WorkDeps {
  api: Api;
  adapters: Record<SocialChannel, ChannelAdapter>;
  state: RunnerState;
  now: () => Date;
  sleep: Sleep;
  rng: () => number;
  tz: string;
  log: (m: string) => void;
  candidateLimit: number;
  /** Fetches new email replies; omit to skip. */
  imap?: () => Promise<ImapReplies>;
}

export interface WorkSummary {
  exitCode: (typeof EXIT)[keyof typeof EXIT];
  channels: Record<SocialChannel, { halted: boolean; errored: boolean; steps: string[] }>;
  imap: "skipped" | "ok" | "error";
}

const CHANNELS: SocialChannel[] = ["LINKEDIN", "X"];

/** One full pass: per channel discover -> run tasks -> inbox, then email replies, then a final heartbeat. Stops a channel at its first halt. */
export async function runWork(deps: WorkDeps): Promise<WorkSummary> {
  const { api } = deps;
  const summary: WorkSummary = {
    exitCode: EXIT.OK,
    channels: { LINKEDIN: { halted: false, errored: false, steps: [] }, X: { halted: false, errored: false, steps: [] } },
    imap: "skipped",
  };

  let candidates: Awaited<ReturnType<Api["getCandidates"]>> | null = null;
  let candidatesFailed = false;
  if (inSendWindow(deps.now(), deps.tz)) {
    try {
      candidates = await api.getCandidates(deps.candidateLimit);
    } catch (e) {
      if (e instanceof FatalApiError) throw e;
      deps.log(`candidates fetch failed: ${(e as Error).message}`);
      candidatesFailed = true;
    }
  } else {
    deps.log("outside the send window: no browser work");
  }

  for (const channel of CHANNELS) {
    if (!inSendWindow(deps.now(), deps.tz)) break;
    const adapter = deps.adapters[channel];
    const ch = summary.channels[channel];
    const note = (step: string, outcome: string) => ch.steps.push(`${step}:${outcome}`);
    const settle = (outcome: string): "halt" | "stop" | "go" => {
      if (outcome === "halted") ch.halted = true;
      if (outcome === "error") ch.errored = true;
      if (outcome === "halted") return "halt";
      if (["killswitch", "window_closed", "disabled", "outside_window"].includes(outcome)) return "stop";
      return "go";
    };

    if (candidatesFailed) ch.errored = true;
    else if (candidates) {
      try {
        const d = await discoverChannel(channel, candidates, { api, adapter, now: deps.now, sleep: deps.sleep, rng: deps.rng, tz: deps.tz, log: deps.log });
        note("discover", d.outcome);
        if (settle(d.outcome) !== "go") continue;
      } catch (e) {
        if (e instanceof FatalApiError) throw e;
        deps.log(`${channel} discover threw: ${(e as Error).message}`);
        ch.errored = true;
      }
    }

    const r = await runChannel(channel, { api, adapter, state: deps.state, now: deps.now, sleep: deps.sleep, rng: deps.rng, tz: deps.tz, log: deps.log });
    note("tasks", r.outcome);
    if (settle(r.outcome) !== "go") continue;

    try {
      const i = await runInbox(channel, { api, adapter, now: deps.now, tz: deps.tz, log: deps.log });
      note("inbox", i.outcome);
      settle(i.outcome);
    } catch (e) {
      if (e instanceof FatalApiError) throw e;
      deps.log(`${channel} inbox threw: ${(e as Error).message}`);
      ch.errored = true;
    }
  }

  if (deps.imap) {
    try {
      const { replies, commit } = await deps.imap();
      let allSent = true;
      for (const r of replies) {
        try {
          await api.report({ type: "REPLY", channel: "EMAIL", email: r.email, body: r.body.slice(0, 8000) });
        } catch (e) {
          if (e instanceof FatalApiError) throw e;
          deps.log(`email reply report failed: ${(e as Error).message}`);
          // A rejection is skipped so one bad reply can never block the UID; only retryable failures hold it back.
          if (isRetryable(e)) {
            allSent = false;
            break;
          }
        }
      }
      if (allSent) {
        commit();
        summary.imap = "ok";
      } else {
        summary.imap = "error";
      }
    } catch (e) {
      if (e instanceof FatalApiError) throw e;
      deps.log(`IMAP failed: ${(e as Error).message}`);
      summary.imap = "error";
    }
  }

  try {
    await api.heartbeat();
  } catch (e) {
    if (e instanceof FatalApiError) throw e;
    deps.log(`final heartbeat failed: ${(e as Error).message}`);
  }

  const anyHalt = CHANNELS.some((c) => summary.channels[c].halted);
  const anyError = CHANNELS.some((c) => summary.channels[c].errored) || summary.imap === "error";
  summary.exitCode = anyHalt ? EXIT.HALT : anyError ? EXIT.ERROR : EXIT.OK;
  return summary;
}

/**
 * What a real run would do, without a browser and without fetching tasks
 * (fetching tasks creates queue rows on the server, so it is not a read-only call).
 */
export async function describePlan(deps: Pick<WorkDeps, "api" | "now" | "tz" | "candidateLimit">, imapConfigured: boolean): Promise<string[]> {
  const now = deps.now();
  const lines = [
    `now: ${now.toISOString()} (${deps.tz})`,
    `active day: ${isActiveDay(now, deps.tz) ? "yes" : "no"}; send window: ${inSendWindow(now, deps.tz) ? "OPEN" : "CLOSED"}`,
  ];
  for (const channel of CHANNELS) {
    try {
      const s = await deps.api.getStatus(channel);
      lines.push(`${channel}: ${s.enabled ? "enabled" : "DISABLED"}${s.dryRun ? " (dry-run: nothing will be sent)" : " (LIVE)"}; ${s.invitedLeads.length} invited lead(s) awaiting acceptance`);
    } catch (e) {
      lines.push(`${channel}: status unavailable (${(e as Error).message})`);
    }
  }
  try {
    lines.push(`discovery: ${(await deps.api.getCandidates(deps.candidateLimit)).length} candidate(s) would be searched on each enabled channel`);
  } catch (e) {
    lines.push(`discovery: candidates unavailable (${(e as Error).message})`);
  }
  lines.push("tasks: not fetched in --dry-probe (fetching them creates queue rows on the server)");
  lines.push(`IMAP: ${imapConfigured ? "will run" : "not configured"}`);
  return lines;
}
