import type { Candidate, Signals } from "./types";

export const MIN_MATCH_CONFIDENCE = 0.8;

export interface SocialProfile {
  handle: string;
  name: string;
  headline?: string;
  bio?: string;
  location?: string;
}

const CREDENTIALS = new Set(["rcic", "cicc", "mr", "mrs", "ms", "dr", "phd", "cpa", "esq", "llb", "jr", "sr"]);
const GENERIC_COMPANY = new Set(["inc", "ltd", "llc", "corp", "corporation", "services", "service", "consulting", "consultants", "consultant", "immigration", "law", "group", "the", "and", "of", "canada", "canadian", "solutions", "associates", "firm", "co"]);

function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function nameTokens(s: string): string[] {
  return fold(s).replace(/[^a-z]+/g, " ").split(" ").filter((t) => t.length > 1 && !CREDENTIALS.has(t));
}

function nameScore(candidateName: string, profileName: string): number {
  const a = nameTokens(candidateName);
  const b = nameTokens(profileName);
  if (!a.length || !b.length) return 0;
  const sa = new Set(a);
  const sb = new Set(b);
  const inter = [...sa].filter((t) => sb.has(t)).length;
  if (inter === sa.size && inter === sb.size) return 1;
  if (a.length >= 2 && b.length >= 2 && a[0] === b[0] && a[a.length - 1] === b[b.length - 1]) return 0.95;
  return (inter / Math.max(sa.size, sb.size)) * 0.7;
}

function hasRcicKeyword(text: string): boolean {
  const t = fold(text).replace(/\./g, "");
  return /\brcic\b/.test(t) || /\bcicc\b/.test(t) || /immigration consultant/.test(t);
}

function companyOverlap(company: string | null, text: string): boolean {
  if (!company) return false;
  const hay = new Set(fold(text).replace(/[^a-z0-9]+/g, " ").split(" "));
  return fold(company).replace(/[^a-z0-9]+/g, " ").split(" ").filter((t) => t.length > 2 && !GENERIC_COMPANY.has(t)).some((t) => hay.has(t));
}

function cityOverlap(city: string | null, text: string): boolean {
  if (!city) return false;
  const c = fold(city).replace(/[^a-z0-9]+/g, " ").trim();
  return c.length > 1 && ` ${fold(text).replace(/[^a-z0-9]+/g, " ")} `.includes(` ${c} `);
}

/** Confidence 0..1. Name carries 0.6, the RCIC keyword 0.25, company 0.1, city 0.05. A weak name match never reaches the threshold. */
export function scoreMatch(candidate: Candidate, profile: SocialProfile): number {
  const name = nameScore(candidate.fullName, profile.name);
  if (name === 0) return 0;
  const body = [profile.headline, profile.bio].filter(Boolean).join(" ");
  const all = [body, profile.location].filter(Boolean).join(" ");
  let score = 0.6 * name;
  if (hasRcicKeyword(body)) score += 0.25;
  if (companyOverlap(candidate.company, all)) score += 0.1;
  if (cityOverlap(candidate.city, all)) score += 0.05;
  if (name < 0.9) score = Math.min(score, MIN_MATCH_CONFIDENCE - 0.01);
  return Math.round(Math.min(1, score) * 100) / 100;
}

/** Best profile at or above the threshold, or null. Two profiles at or above it is ambiguous and rejected. */
export function pickMatch(candidate: Candidate, profiles: readonly SocialProfile[]): { profile: SocialProfile; confidence: number } | null {
  const accepted = profiles
    .map((profile) => ({ profile, confidence: scoreMatch(candidate, profile) }))
    .filter((s) => s.confidence >= MIN_MATCH_CONFIDENCE);
  return accepted.length === 1 ? accepted[0] : null;
}

/** Conservative: anything not evidenced is false. Profile views are server-side data, so never claimed here. */
export function deriveSignals(profileText: string, extra: { lastActivityDaysAgo?: number | null; hasPhoto?: boolean } = {}): Signals {
  const text = profileText ?? "";
  const employees = /(\d[\d,]*)\+?\s*employees/i.exec(text);
  const largeFirm = employees ? Number(employees[1].replace(/,/g, "")) >= 50 : false;
  return {
    postedAboutMarketing: /\b(marketing|social media|lead generation|client acquisition|branding)\b/i.test(text),
    soloOrSmallFirm: !largeFirm && /\b(solo|sole practitioner|independent|founder|owner|principal)\b/i.test(text),
    activeLast21Days: extra.lastActivityDaysAgo != null && extra.lastActivityDaysAgo <= 21,
    socialProfileComplete: extra.hasPhoto === true && text.length >= 120,
    hadProfileViews30d: false,
  };
}
