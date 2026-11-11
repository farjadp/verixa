export interface ScoreSignals {
  ciccActive: boolean;
  postedAboutMarketing: boolean;
  soloOrSmallFirm: boolean;
  activeLast21Days: boolean;
  hadProfileViews30d: boolean;
  socialProfileComplete: boolean;
}

const WEIGHTS: Record<keyof ScoreSignals, number> = {
  ciccActive: 13,
  postedAboutMarketing: 8,
  soloOrSmallFirm: 5,
  activeLast21Days: 3,
  hadProfileViews30d: 2,
  socialProfileComplete: 1,
};

/** An active licence is a gate: without it the lead is worthless. */
export function scoreLead(s: ScoreSignals): number {
  if (!s.ciccActive) return 0;
  return (Object.keys(WEIGHTS) as (keyof ScoreSignals)[]).reduce((sum, k) => (s[k] ? sum + WEIGHTS[k] : sum), 0);
}

/** The CICC import stores "Yes"/"No"; also accept "Active". */
export function isCiccActive(status: string | null | undefined): boolean {
  const v = (status ?? "").trim().toLowerCase();
  return v === "yes" || v === "active";
}
