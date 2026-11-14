/**
 * Minimal A/B framework for outreach. v1 tests touch-1 subject lines only.
 *
 * Rules (decided Nov 2026, see docs/superpowers/outreach-learning.md):
 * - Touch 1 is a founder-approved template. An experiment changes nothing until `approved` is set in code by a PR
 *   that Farjad signs off; the dashboard shows unapproved experiments as "waiting for approval".
 * - Success = a human reply (positive or question) to touch 1 before touch 2 goes out. Opens are not tracked.
 * - Bayesian readout with a Beta(1,19) prior (≈5% reply rate). No look before `minPerArm` sends per arm;
 *   adopt the challenger only if P(challenger > control) ≥ `threshold`; stop at `maxPerArm` and keep control.
 *   At ~25 touch-1 sends a week that is ~8 weeks to the first look. Only large gaps (~3x) are detectable.
 * - A winner is a recommendation. Nothing switches automatically; Farjad changes the template.
 */
import { displayName } from "./intro-email";

export interface ExperimentArm {
  id: string;
  /** null = keep the template's own subject (the control). */
  subject: ((firstName: string) => string) | null;
}

export interface Experiment {
  id: string;
  title: string;
  step: 1;
  arms: readonly [ExperimentArm, ExperimentArm];
  /** Only an approved experiment assigns variants. Set by PR with Farjad's sign-off. */
  approved: boolean;
  approvedNote?: string;
  /** Set when a decision was taken; a concluded experiment assigns nothing. */
  concluded?: boolean;
  minPerArm: number;
  maxPerArm: number;
  threshold: number;
  prior: { a: number; b: number };
}

export const EXPERIMENTS: readonly Experiment[] = [
  {
    id: "t1-subject-2026-11",
    title: "Touch 1 subject: listing vs ready-to-claim",
    step: 1,
    arms: [
      { id: "A", subject: null }, // "Your CICC listing is on Verixa, {Name}"
      { id: "B", subject: (n) => (displayName(n) ? `${displayName(n)}, your Verixa profile is ready to claim` : "Your Verixa profile is ready to claim") },
    ],
    approved: false, // waiting for Farjad
    minPerArm: 100,
    maxPerArm: 200,
    threshold: 0.95,
    prior: { a: 1, b: 19 },
  },
];

/** The experiment that currently assigns variants for a step, if any. */
export function activeExperiment(step: number, list: readonly Experiment[] = EXPERIMENTS): Experiment | null {
  return list.find((e) => e.step === step && e.approved && !e.concluded) ?? null;
}

/** Deterministic 50/50 split by lead id (FNV-1a), so re-runs and dry runs give a lead the same arm. */
export function assignArm(exp: Experiment, leadId: string): ExperimentArm {
  let h = 0x811c9dc5;
  for (const ch of `${exp.id}:${leadId}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return exp.arms[h % exp.arms.length];
}

/** Stored on the touch: `<experimentId>:<armId>`. */
export const variantKey = (exp: Experiment, arm: ExperimentArm) => `${exp.id}:${arm.id}`;

export function subjectFor(arm: ExperimentArm, firstName: string, templateSubject: string): string {
  return arm.subject ? arm.subject(firstName) : templateSubject;
}

// ── Readout ──────────────────────────────────────────────────────────────────

function lgamma(x: number): number {
  // Lanczos approximation (g = 7), accurate to ~1e-13 for x > 0.
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

const logBeta = (a: number, b: number) => lgamma(a) + lgamma(b) - lgamma(a + b);

/** P(pB > pA) for independent Beta posteriors, by numeric integration on a grid (deterministic). */
export function probBBeatsA(a: { a: number; b: number }, b: { a: number; b: number }, steps = 2000): number {
  const pdf = (x: number, p: { a: number; b: number }) => Math.exp((p.a - 1) * Math.log(x) + (p.b - 1) * Math.log(1 - x) - logBeta(p.a, p.b));
  let cdfA = 0;
  let total = 0;
  const h = 1 / steps;
  for (let i = 0; i < steps; i++) {
    const x = (i + 0.5) * h;
    const fa = pdf(x, a) * h;
    total += pdf(x, b) * h * (cdfA + fa / 2);
    cdfA += fa;
  }
  return Math.min(1, Math.max(0, total));
}

export interface ArmResult { armId: string; sent: number; replies: number }
export type ExperimentStatus = "waiting_approval" | "collecting" | "winner" | "keep_control" | "concluded";
export interface ExperimentReadout {
  id: string;
  title: string;
  status: ExperimentStatus;
  arms: ArmResult[];
  /** P(challenger beats control); null before the first look. */
  pChallengerBetter: number | null;
  message: string;
}

export function evaluateExperiment(exp: Experiment, results: readonly ArmResult[]): ExperimentReadout {
  const arms = exp.arms.map((arm) => results.find((r) => r.armId === arm.id) ?? { armId: arm.id, sent: 0, replies: 0 });
  const base = { id: exp.id, title: exp.title, arms, pChallengerBetter: null };
  if (!exp.approved) return { ...base, status: "waiting_approval", message: "Waiting for Farjad's approval. Nothing is sent with the challenger until then." };
  if (exp.concluded) return { ...base, status: "concluded", message: "Concluded. No variants are assigned." };
  const [control, challenger] = arms;
  const minSent = Math.min(control.sent, challenger.sent);
  if (minSent < exp.minPerArm) {
    return { ...base, status: "collecting", message: `Collecting: ${control.sent} and ${challenger.sent} of ${exp.minPerArm} sends per arm before the first look.` };
  }
  const post = (r: ArmResult) => ({ a: exp.prior.a + r.replies, b: exp.prior.b + r.sent - r.replies });
  const p = probBBeatsA(post(control), post(challenger));
  const pct = `${Math.round(p * 100)}%`;
  if (p >= exp.threshold) return { ...base, pChallengerBetter: p, status: "winner", message: `Challenger ${challenger.armId} wins (P=${pct}). Recommend making it the template; Farjad decides.` };
  if (minSent >= exp.maxPerArm) return { ...base, pChallengerBetter: p, status: "keep_control", message: `No clear winner after ${exp.maxPerArm} per arm (P=${pct}). Keep the current subject.` };
  return { ...base, pChallengerBetter: p, status: "collecting", message: `No winner yet (P=${pct}, needs ${Math.round(exp.threshold * 100)}%). Keep collecting up to ${exp.maxPerArm} per arm.` };
}
