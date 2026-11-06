import type { AdapterResult, ChannelAdapter } from "./adapters/types";
import { FatalApiError, type Api } from "./api";
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

/**
 * Executes one channel's tasks. Verixa decides what to send; this only carries it out, and stops at the first sign of trouble.
 * Order for every live task: gap, window check, kill-switch check, checkpoint check, crash-resend guard, action, report.
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
      return false;
    }
  };

  const halt = async (h: Halt): Promise<void> => {
    result.outcome = "halted";
    result.haltReason = h.reason;
    deps.log(`HALT ${channel} ${h.reason}: ${h.detail}`);
    await report({ type: "CHANNEL_HALT", channel, reason: h.reason, detail: h.detail.slice(0, 1000) });
  };

  const haltFrom = (r: Exclude<AdapterResult<unknown>, { status: "ok" | "dmsClosed" }>): Halt =>
    r.status === "checkpoint"
      ? { reason: "CHECKPOINT", detail: r.detail }
      : { reason: "ADAPTER_BROKEN", detail: r.screenshot ? `${r.detail} (screenshot: ${r.screenshot})` : r.detail };

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

    // Crash-resend guard: local log first, then the live thread.
    let alreadySent = state.hasAction(task.touchId);
    if (!alreadySent) {
      let seen: AdapterResult<boolean>;
      try {
        seen = await adapter.hasSentText(task.handle, task.body);
      } catch (e) {
        // If we cannot tell, we must not send.
        result.failed++;
        const ok = await reportOrStop({ type: "TOUCH_RESULT", touchId: task.touchId, status: "FAILED", error: `thread check failed: ${(e as Error).message}`.slice(0, 500) });
        return ok ? "acted" : "stop";
      }
      if (seen.status === "checkpoint" || seen.status === "broken") {
        await halt(haltFrom(seen));
        return "stop";
      }
      alreadySent = seen.status === "ok" && seen.value;
    }
    if (alreadySent) {
      result.sent++;
      return (await reportOrStop({ type: "TOUCH_RESULT", touchId: task.touchId, status: "SENT" })) ? "idle" : "stop";
    }

    let out: AdapterResult<{ externalMessageId?: string }>;
    try {
      out = task.kind === "INVITE" ? await adapter.invite(task.handle, task.body) : await adapter.sendMessage(task.handle, task.body);
    } catch (e) {
      result.failed++;
      const ok = await reportOrStop({ type: "TOUCH_RESULT", touchId: task.touchId, status: "FAILED", error: (e as Error).message.slice(0, 500) });
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

