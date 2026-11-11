import { DefiniteFailure } from "./adapters/guard";
import type { AdapterResult, ChannelAdapter, ThreadCheck } from "./adapters/types";
import { FatalApiError, isRetryable, type Api } from "./api";
import { inSendWindow, localDay, randomGapMs, type Sleep } from "./timing";
import type { SocialChannel, WorkerReport, WorkerTask } from "./types";
import type { ActionEntry } from "./state";

/** Mirrors OUTREACH.touchesPerChannelPerDay and linkedinInviteNoteMax in src/lib/outreach/config.ts. */
export const MAX_ACTIONS_PER_DAY = 5;
export const INVITE_NOTE_MAX = 300;

export interface RunnerState {
  hasAction(touchId: string): boolean;
  recordAction(day: string, entry: ActionEntry): void;
  countActions(day: string, channel: ActionEntry["channel"]): number;
}

export interface RunnerDeps {
  api: Api;
  adapter: ChannelAdapter;
  state: RunnerState;
  now: () => Date;
  sleep: Sleep;
  rng: () => number;
  tz: string;
  log: (msg: string) => void;
}

export type RunOutcome = "completed" | "disabled" | "outside_window" | "window_closed" | "killswitch" | "halted" | "error";

export interface RunResult {
  channel: SocialChannel;
  outcome: RunOutcome;
  sent: number;
  failed: number;
  skipped: number;
  haltReason?: "CHECKPOINT" | "ADAPTER_BROKEN";
}

type Halt = { reason: "CHECKPOINT" | "ADAPTER_BROKEN"; detail: string };

/** Maps a non-ok adapter result to the CHANNEL_HALT it should produce. */
export function haltFromResult(r: Exclude<AdapterResult<unknown>, { status: "ok" | "dmsClosed" }>): Halt {
  return r.status === "checkpoint"
    ? { reason: "CHECKPOINT", detail: r.detail }
    : { reason: "ADAPTER_BROKEN", detail: r.screenshot ? `${r.detail} (screenshot: ${r.screenshot})` : r.detail };
}

function inLeadWindow(now: Date, tz: string): boolean {
  try {
    return inSendWindow(now, tz);
  } catch {
    return false; // unknown zone: do not guess
  }
}

/**
 * Executes one channel's tasks. Verixa decides what to send; this only carries it out, and stops at the first sign of trouble.
 * Order for every live task: gap, window check, kill-switch check, checkpoint check, thread check (crash-resend guard + unseen reply), lead check, action, report.
 */
export async function runChannel(channel: SocialChannel, deps: RunnerDeps): Promise<RunResult> {
  const { api, adapter, state } = deps;
  const result: RunResult = { channel, outcome: "completed", sent: 0, failed: 0, skipped: 0 };
  let fatal: Error | null = null;

  const report = async (r: WorkerReport): Promise<boolean> => {
    try {
      await api.report(r);
      return true;
    } catch (e) {
      deps.log(`report ${r.type} failed: ${(e as Error).message}`);
      if (e instanceof FatalApiError) fatal = e;
      // A rejection will never succeed on retry; the thread guard prevents a resend, so keep going.
      return !(e instanceof FatalApiError) && !isRetryable(e);
    }
  };

  const halt = async (h: Halt): Promise<void> => {
    result.outcome = "halted";
    result.haltReason = h.reason;
    deps.log(`HALT ${channel} ${h.reason}: ${h.detail}`);
    await report({ type: "CHANNEL_HALT", channel, reason: h.reason, detail: h.detail.slice(0, 1000) });
  };

  const haltFrom = haltFromResult;

  try {
    const initial = await api.getStatus(channel);
    if (!initial.enabled) {
      result.outcome = "disabled";
      return result;
    }
    if (!inSendWindow(deps.now(), deps.tz)) {
      result.outcome = "outside_window";
      return result;
    }

    const tasks = await api.getTasks(channel);
    let actedLive = false;

    for (const task of tasks) {
      if (task.dryRun) {
        result.skipped++;
        continue;
      }
      if (!inLeadWindow(deps.now(), task.timezone)) {
        deps.log(`${task.touchId}: outside the send window in ${task.timezone}, skipped`);
        result.skipped++;
        continue;
      }
      if (state.countActions(localDay(deps.now(), deps.tz), channel) >= MAX_ACTIONS_PER_DAY) {
        deps.log(`${channel}: local daily cap reached`);
        break;
      }
      if (actedLive) {
        await deps.sleep(randomGapMs(deps.rng));
        if (!inSendWindow(deps.now(), deps.tz)) {
          result.outcome = "window_closed";
          break;
        }
      }

      // Kill switch immediately before the action, never cached.
      const status = await api.getStatus(channel);
      if (!status.enabled || status.dryRun) {
        result.outcome = "killswitch";
        break;
      }

      if (await adapter.detectCheckpoint()) {
        await halt({ reason: "CHECKPOINT", detail: "checkpoint, captcha or login wall detected before acting" });
        break;
      }

      const step = await processTask(task);
      if (step === "stop") break;
      if (step === "acted") actedLive = true;
    }
  } catch (e) {
    result.outcome = "error";
    deps.log(`run error: ${(e as Error).message}`);
    if (e instanceof FatalApiError) fatal = e;
  } finally {
    try {
      await api.heartbeat();
    } catch (e) {
      deps.log(`heartbeat failed: ${(e as Error).message}`);
      if (e instanceof FatalApiError) fatal ??= e;
    }
  }
  if (fatal) throw fatal;
  return result;

  async function processTask(task: WorkerTask): Promise<"acted" | "idle" | "stop"> {
    const day = localDay(deps.now(), deps.tz);

    if (task.kind === "INVITE" && task.body.length > INVITE_NOTE_MAX) {
      result.failed++;
      return (await reportOrStop({ type: "TOUCH_RESULT", touchId: task.touchId, status: "FAILED", error: `invite note is ${task.body.length} chars; limit ${INVITE_NOTE_MAX}` })) ? "idle" : "stop";
    }

    // Crash-resend guard: local log first, then the live thread. The same thread check catches a reply the inbox missed.
    let alreadySent = state.hasAction(task.touchId);
    let inbound: string | null = null;
    if (!alreadySent) {
      let seen: AdapterResult<ThreadCheck>;
      try {
        seen = await adapter.checkThread(task.handle, task.body);
      } catch (e) {
        // Nothing was written, so nothing is reported: the touch stays QUEUED and the next run checks again.
        deps.log(`thread check failed for ${task.touchId}: ${(e as Error).message}`);
        result.failed++;
        return "idle";
      }
      if (seen.status === "checkpoint" || seen.status === "broken") {
        await halt(haltFrom(seen));
        return "stop";
      }
      if (seen.status === "ok") {
        alreadySent = seen.value.sent;
        inbound = seen.value.inbound;
      }
    }
    const reportInbound = async (): Promise<boolean> =>
      inbound === null || (await reportOrStop({ type: "REPLY", channel, handle: task.handle, body: inbound.slice(0, 8000) }));
    if (alreadySent) {
      result.sent++;
      if (!(await reportOrStop({ type: "TOUCH_RESULT", touchId: task.touchId, status: "SENT" }))) return "stop";
      return (await reportInbound()) ? "idle" : "stop";
    }
    if (inbound !== null) {
      // They wrote since our last message: never send over a reply. The server classifies it and moves the lead; the touch stays QUEUED.
      deps.log(`${task.touchId}: lead has written since our last message, not sending`);
      result.skipped++;
      return (await reportInbound()) ? "idle" : "stop";
    }

    // Last-moment re-check of this one person. Fails closed: if Verixa cannot answer, nothing is sent.
    try {
      const check = await api.leadCheck(task.touchId);
      if (!check.sendable) {
        deps.log(`${task.touchId}: not sendable (${check.reason ?? "no reason"}), skipped`);
        result.skipped++;
        return "idle";
      }
    } catch (e) {
      if (e instanceof FatalApiError) throw e;
      deps.log(`lead check failed: ${(e as Error).message}`);
      result.outcome = "error";
      return "stop";
    }

    let out: AdapterResult<{ externalMessageId?: string }>;
    try {
      out = task.kind === "INVITE" ? await adapter.invite(task.handle, task.body) : await adapter.sendMessage(task.handle, task.body);
    } catch (e) {
      result.failed++;
      // Only a failure raised before any write action is "definitely not sent". Anything else may have gone out.
      const definite = e instanceof DefiniteFailure;
      const ok = await reportOrStop({ type: "TOUCH_RESULT", touchId: task.touchId, status: definite ? "FAILED" : "UNCERTAIN", error: (e as Error).message.slice(0, 500) });
      return ok ? "acted" : "stop";
    }

    switch (out.status) {
      case "ok": {
        state.recordAction(day, { channel, touchId: task.touchId, handle: task.handle, kind: task.kind });
        result.sent++;
        const rep: WorkerReport = { type: "TOUCH_RESULT", touchId: task.touchId, status: "SENT", ...(out.value.externalMessageId ? { externalMessageId: out.value.externalMessageId } : {}) };
        return (await reportOrStop(rep)) ? "acted" : "stop";
      }
      case "dmsClosed":
        return (await reportOrStop({ type: "DMS_CLOSED", leadId: task.leadId })) ? "acted" : "stop";
      default:
        await halt(haltFrom(out));
        return "stop";
    }
  }

  async function reportOrStop(r: WorkerReport): Promise<boolean> {
    if (await report(r)) return true;
    result.outcome = "error";
    return false;
  }
}

