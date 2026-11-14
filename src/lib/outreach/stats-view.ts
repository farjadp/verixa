// src/lib/outreach/stats-view.ts — the stats shape the admin page renders (plain JSON, dates as ISO strings).
import { diagnose, type Finding } from "./diagnosis";
import type { ExperimentReadout } from "./experiments";
import { cohorts, funnel, sentTouches, series, type Bucket, type Cohort, type Funnel, type StatsInput } from "./metrics";
import { experimentReadouts } from "./weekly-report";

/** Email outreach stats for the admin page. Plain JSON: dates are ISO strings. */
export type OutreachStats = {
  days: Bucket[];
  weeks: Bucket[];
  cohorts: Cohort[];
  funnel: Funnel;
  findings: Finding[];
  experiments: ExperimentReadout[];
  runs: { startedAt: string; status: string; scheduled: number; dryRun: number; failed: number; followUpsHeld: number; detail: string | null }[];
  bounces: { at: string; type: string | null; domain: string | null; reason: string | null; step: number }[];
  uncertain: number;
};

export function buildOutreachStats(input: StatsInput, now: Date, emailOn: boolean): OutreachStats {
  const sent = sentTouches(input, now);
  return {
    days: series(input, now, "day", 14),
    weeks: series(input, now, "week", 8),
    cohorts: cohorts(input, now),
    funnel: funnel(input, now),
    findings: diagnose({ now, input, emailOn }),
    experiments: experimentReadouts(input, now),
    runs: input.runs.slice(-10).reverse().map((r) => ({ ...r, startedAt: r.startedAt.toISOString() })),
    bounces: sent.filter((t) => t.bouncedAt).slice(-10).reverse().map((t) => ({
      at: t.bouncedAt!.toISOString(), type: t.bounceType, domain: t.email?.split("@")[1] ?? null, reason: t.bounceReason, step: t.step,
    })),
    uncertain: input.touches.filter((t) => t.status === "UNCERTAIN").length,
  };
}
