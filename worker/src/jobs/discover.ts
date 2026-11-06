import { haltFromResult } from "../runner";
import type { ChannelAdapter } from "../adapters/types";
import { FatalApiError, isRetryable, type Api } from "../api";
import { deriveSignals, pickMatch } from "../match";
import { inSendWindow, type Sleep } from "../timing";
import type { Candidate, SocialChannel } from "../types";

export interface DiscoverDeps {
  api: Api;
  adapter: ChannelAdapter;
  now: () => Date;
  sleep: Sleep;
  rng: () => number;
  tz: string;
  log: (m: string) => void;
}

export interface DiscoverResult {
  outcome: "completed" | "killswitch" | "window_closed" | "halted" | "error";
  searched: number;
  matched: number;
}

/** Searches each candidate on the channel and reports LEAD_MATCHED only for a single match at or above 0.8. Read-only on the site. */
export async function discoverChannel(channel: SocialChannel, candidates: Candidate[], deps: DiscoverDeps): Promise<DiscoverResult> {
  const { api, adapter } = deps;
  const res: DiscoverResult = { outcome: "completed", searched: 0, matched: 0 };

  const report = async (r: Parameters<Api["report"]>[0]): Promise<boolean> => {
    try {
      await api.report(r);
      return true;
    } catch (e) {
      deps.log(`report ${r.type} failed: ${(e as Error).message}`);
      if (e instanceof FatalApiError) throw e;
      if (!isRetryable(e)) return true; // rejected: skip it, the rest of the batch is unaffected
      res.outcome = "error";
      return false;
    }
  };

  for (const [i, c] of candidates.entries()) {
    if (i > 0) await deps.sleep(3000 + Math.round(deps.rng() * 6000));
    if (!inSendWindow(deps.now(), deps.tz)) {
      res.outcome = "window_closed";
      return res;
    }
    // Kill switch before every search, never cached.
    let enabled: boolean;
    try {
      enabled = (await api.getStatus(channel)).enabled;
    } catch (e) {
      if (e instanceof FatalApiError) throw e;
      res.outcome = "error";
      return res;
    }
    if (!enabled) {
      res.outcome = "killswitch";
      return res;
    }
    if (await adapter.detectCheckpoint()) {
      res.outcome = "halted";
      await report({ type: "CHANNEL_HALT", channel, reason: "CHECKPOINT", detail: "checkpoint, captcha or login wall detected before searching" });
      return res;
    }

    res.searched++;
    let found;
    try {
      found = await adapter.findProfile(c);
    } catch (e) {
      deps.log(`search failed for ${c.consultantProfileId}: ${(e as Error).message}`);
      continue;
    }
    if (found.status === "checkpoint" || found.status === "broken") {
      const h = haltFromResult(found);
      res.outcome = "halted";
      await report({ type: "CHANNEL_HALT", channel, reason: h.reason, detail: h.detail.slice(0, 1000) });
      return res;
    }
    if (found.status !== "ok") continue;

    const m = pickMatch(c, found.value);
    if (!m) continue;
    const ok = await report({
      type: "LEAD_MATCHED",
      consultantProfileId: c.consultantProfileId,
      channel,
      handle: m.profile.handle,
      matchConfidence: m.confidence,
      timezone: c.timezone,
      signals: deriveSignals([m.profile.headline, m.profile.bio].filter(Boolean).join(" ")),
    });
    if (!ok) return res;
    res.matched++;
  }
  return res;
}
