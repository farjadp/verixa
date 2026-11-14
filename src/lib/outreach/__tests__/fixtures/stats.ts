import type { StatsInput, StatsTouch } from "../../metrics";

export const NOW = new Date("2026-11-26T15:00:00Z"); // Thu 10:00 Toronto
export const at = (iso: string) => new Date(iso);

export function touch(id: string, leadId: string, step: number, sentAt: string, over: Partial<StatsTouch> = {}): StatsTouch {
  return {
    id, leadId, step, status: "SENT", variant: null, scheduledFor: at(sentAt), sentAt: at(sentAt),
    deliveredAt: at(sentAt), bouncedAt: null, bounceType: null, bounceReason: null, complainedAt: null,
    email: `${leadId}@example.com`, ...over,
  };
}

export const emptyInput = (): StatsInput => ({ leads: [], touches: [], replies: [], unsubscribes: [], clicks: [], runs: [] });

/** `n` people each sent touch 1 on the given day, delivered, staggered by a minute. */
export function sentDay(prefix: string, ymdT: string, n: number, over: Partial<StatsTouch> = {}): StatsTouch[] {
  return Array.from({ length: n }, (_, i) => {
    const t = new Date(at(ymdT).getTime() + i * 60_000).toISOString();
    return touch(`${prefix}${i}`, `${prefix}L${i}`, 1, t, over);
  });
}
