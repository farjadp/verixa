// ============================================================================
// Content Pipeline — editorial gate rules (pure; unit tested)
// The reviewer agent combines an LLM fact-check with these deterministic
// checks. The gate is conservative: any claim the sources contradict or don't
// contain fails the draft at standard/strict strictness.
// ============================================================================
import type { Strictness } from "./config";
import { checkHeadingStructure } from "./seo";
import { hasDisclaimer, wordCount } from "./markdown";
import { normalizeUrl } from "./dedup";

export type ClaimVerdict = "supported" | "unsupported" | "unverifiable";

export interface ClaimCheck {
  claim: string;
  verdict: ClaimVerdict;
  note: string;
}

export const BANNED_PHRASES = [
  "delve",
  "tapestry",
  "in conclusion",
  "it is important to note",
  "navigating the",
  "demystify",
  "game-changer",
  "guaranteed approval",
  "100% success",
];

export const MIN_WORDS = 350;

export interface DeterministicChecks {
  disclaimerPresent: boolean;
  wordCount: number;
  citationCount: number;
  headingIssues: string[];
  bannedPhrases: string[];
  offSourceLinks: string[]; // external links not in the allowed source list
}

const EXTERNAL_LINK = /\]\((https?:\/\/[^)\s]+)\)/g;

export function runDeterministicChecks(md: string, allowedSourceUrls: string[]): DeterministicChecks {
  const allowed = new Set(allowedSourceUrls.map(normalizeUrl));
  const external = [...md.matchAll(EXTERNAL_LINK)].map((m) => m[1]);
  const lower = md.toLowerCase();
  return {
    disclaimerPresent: hasDisclaimer(md),
    wordCount: wordCount(md),
    citationCount: external.filter((u) => allowed.has(normalizeUrl(u))).length,
    headingIssues: checkHeadingStructure(md),
    bannedPhrases: BANNED_PHRASES.filter((p) => lower.includes(p)),
    offSourceLinks: [...new Set(external.filter((u) => !allowed.has(normalizeUrl(u))))],
  };
}

export interface ReviewOutcome {
  score: number;
  passed: boolean;
  flags: string[];
  unsupported: number;
  unverifiable: number;
}

/** Combine LLM score + claim verdicts + deterministic checks into a 0-100 score and a pass/fail. */
export function computeReviewScore(input: {
  llmScore: number;
  claims: ClaimCheck[];
  checks: DeterministicChecks;
  strictness: Strictness;
  minScore: number;
}): ReviewOutcome {
  const { claims, checks, strictness } = input;
  const flags: string[] = [];
  let score = Math.min(Math.max(Math.round(input.llmScore), 0), 100);

  const unsupported = claims.filter((c) => c.verdict === "unsupported");
  const unverifiable = claims.filter((c) => c.verdict === "unverifiable");

  score -= unsupported.length * 15;
  score -= unverifiable.length * (strictness === "strict" ? 10 : 5);
  for (const c of unsupported) flags.push(`Unsupported by sources: ${c.claim}${c.note ? ` — ${c.note}` : ""}`);
  for (const c of unverifiable) flags.push(`Unverifiable: ${c.claim}`);

  if (!checks.disclaimerPresent) {
    score -= 30;
    flags.push("Missing 'general information, not legal advice' disclaimer.");
  }
  if (checks.citationCount === 0) {
    score -= 25;
    flags.push("No citation to an official source.");
  }
  if (checks.wordCount < MIN_WORDS) {
    score -= 20;
    flags.push(`Too short (${checks.wordCount} words; minimum ${MIN_WORDS}).`);
  }
  if (checks.headingIssues.length) {
    score -= Math.min(15, checks.headingIssues.length * 5);
    flags.push(...checks.headingIssues);
  }
  if (checks.bannedPhrases.length) {
    score -= Math.min(12, checks.bannedPhrases.length * 3);
    flags.push(`Filler/overclaiming phrases: ${checks.bannedPhrases.join(", ")}`);
  }
  if (checks.offSourceLinks.length) {
    score -= Math.min(15, checks.offSourceLinks.length * 5);
    flags.push(`External links not from cited sources: ${checks.offSourceLinks.join(", ")}`);
  }

  score = Math.max(0, score);

  const maxUnsupported = strictness === "lenient" ? 1 : 0;
  const maxUnverifiable = strictness === "strict" ? 1 : Infinity;
  const passed =
    score >= input.minScore &&
    checks.disclaimerPresent &&
    checks.citationCount > 0 &&
    unsupported.length <= maxUnsupported &&
    unverifiable.length <= maxUnverifiable;

  return { score, passed, flags, unsupported: unsupported.length, unverifiable: unverifiable.length };
}
