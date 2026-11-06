import { haltFromResult } from "../runner";
import type { ChannelAdapter } from "../adapters/types";
import { FatalApiError, isRetryable, type Api } from "../api";
import { inSendWindow } from "../timing";
import type { SocialChannel, WorkerReport } from "../types";

export interface InboxDeps {
  api: Api;
  adapter: ChannelAdapter;
  now: () => Date;
  tz: string;
  log: (m: string) => void;
}

export interface InboxResult {
  outcome: "completed" | "disabled" | "outside_window" | "halted" | "error";
  accepted: number;
  replies: number;
}

/** Reads accepted invites and replies for one channel and reports them. */
export async function runInbox(channel: SocialChannel, deps: InboxDeps): Promise<InboxResult> {
  const { api, adapter } = deps;
  const res: InboxResult = { outcome: "completed", accepted: 0, replies: 0 };
  try {
    const status = await api.getStatus(channel);
    if (!status.enabled) return { ...res, outcome: "disabled" };
    if (!inSendWindow(deps.now(), deps.tz)) return { ...res, outcome: "outside_window" };

    /** "rejected" reports are skipped (the server will never accept them); only retryable failures stop the batch. */
    const send = async (r: WorkerReport): Promise<"ok" | "rejected" | "retry"> => {
      try {
        await api.report(r);
        return "ok";
      } catch (e) {
        if (e instanceof FatalApiError) throw e;
        deps.log(`report ${r.type} failed: ${(e as Error).message}`);
        if (!isRetryable(e)) return "rejected";
        res.outcome = "error";
        return "retry";
      }
    };

    if (await adapter.detectCheckpoint()) {
      res.outcome = "halted";
      await send({ type: "CHANNEL_HALT", channel, reason: "CHECKPOINT", detail: "checkpoint, captcha or login wall detected before reading inbox" });
      return res;
    }

    const read = await adapter.readInbox(status.invitedHandles);
    if (read.status === "dmsClosed") return res;
    // A failed read may still have collected events (conversations already marked read): report them before halting.
    const events = read.status === "ok" ? read.value : read.partial ?? { acceptedHandles: [], replies: [] };

    let stopped = false;
    for (const handle of events.acceptedHandles) {
      for (const lead of status.invitedLeads.filter((l) => l.handle.toLowerCase() === handle.toLowerCase())) {
        const o = await send({ type: "INVITE_ACCEPTED", leadId: lead.leadId });
        if (o === "retry") stopped = true;
        if (o === "ok") res.accepted++;
        if (stopped) break;
      }
      if (stopped) break;
    }
    for (const r of stopped ? [] : events.replies) {
      const o = await send({ type: "REPLY", channel, handle: r.handle, body: r.body.slice(0, 8000) });
      if (o === "retry") break;
      if (o === "ok") res.replies++;
    }

    if (read.status === "checkpoint" || read.status === "broken") {
      const h = haltFromResult(read);
      await send({ type: "CHANNEL_HALT", channel, reason: h.reason, detail: h.detail.slice(0, 1000) });
      res.outcome = "halted";
    }
  } catch (e) {
    if (e instanceof FatalApiError) throw e;
    deps.log(`inbox error: ${(e as Error).message}`);
    res.outcome = "error";
  }
  return res;
}
