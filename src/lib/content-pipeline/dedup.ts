// ============================================================================
// Content Pipeline — topic dedup + ranking (pure, no I/O; unit tested)
// ============================================================================
import { slugify } from "./seo";

const STOPWORDS = new Set(
  (
    "a an and are as at be by for from has have how in into is it its new news of on or our that the their this to " +
    "was were what when where which who will with you your canada canadian government update updates announces " +
    "announced about after over under more now program programs"
  ).split(" ")
);

/** Lowercase, strip accents and punctuation, collapse whitespace. Keeps non-Latin letters (e.g. Persian). */
export function normalizeText(s: string): string {
  return (s || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(s: string): Set<string> {
  return new Set(
    normalizeText(s)
      .split(" ")
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Normalize a URL for idempotency keys: drop protocol, www, query/hash, trailing slash. */
export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, "");
    return `${u.hostname.replace(/^www\./, "")}${path}`.toLowerCase();
  } catch {
    return normalizeText(url);
  }
}

/** Stable idempotency key for a candidate: its source URL when known, else its topic. */
export function dedupKeyFor(c: { sourceUrl?: string | null; title: string }): string {
  return c.sourceUrl ? `url:${normalizeUrl(c.sourceUrl)}` : `topic:${slugify(c.title, 120) || normalizeText(c.title)}`;
}

export interface ExistingPost {
  title: string;
  slug: string;
  targetKeyword?: string | null;
}

export interface DuplicateCheck {
  duplicate: boolean;
  reason?: "slug" | "title" | "similar-title" | "keyword";
  matchedSlug?: string;
  score: number;
}

export const TITLE_SIMILARITY_THRESHOLD = 0.6;
export const KEYWORD_TITLE_THRESHOLD = 0.35;

/**
 * Is a candidate topic already covered by an existing post?
 * - same slug, or same normalized title → duplicate
 * - title token Jaccard ≥ 0.6 → duplicate
 * - same target keyword AND title Jaccard ≥ 0.35 → duplicate
 */
export function checkDuplicate(
  candidate: { title: string; keyword?: string | null },
  existing: ExistingPost[],
  threshold = TITLE_SIMILARITY_THRESHOLD
): DuplicateCheck {
  const cSlug = slugify(candidate.title);
  const cNorm = normalizeText(candidate.title);
  const cTokens = tokenize(candidate.title);
  const cKeyword = candidate.keyword ? normalizeText(candidate.keyword) : "";

  let best: DuplicateCheck = { duplicate: false, score: 0 };

  for (const post of existing) {
    if (cSlug && post.slug === cSlug) return { duplicate: true, reason: "slug", matchedSlug: post.slug, score: 1 };
    if (cNorm && normalizeText(post.title) === cNorm)
      return { duplicate: true, reason: "title", matchedSlug: post.slug, score: 1 };

    const score = jaccard(cTokens, tokenize(post.title));
    if (score >= threshold) return { duplicate: true, reason: "similar-title", matchedSlug: post.slug, score };

    if (cKeyword && post.targetKeyword && normalizeText(post.targetKeyword) === cKeyword && score >= KEYWORD_TITLE_THRESHOLD)
      return { duplicate: true, reason: "keyword", matchedSlug: post.slug, score };

    if (score > best.score) best = { duplicate: false, matchedSlug: post.slug, score };
  }
  return best;
}

export interface Candidate {
  title: string;
  sourceId?: string; // ContentSource.id
  sourceUrl: string | null;
  sourceName: string;
  sourceTrust: number; // 0-100 (ContentSource.trustScore)
  publishedAt: Date | null;
  snippet: string;
  paths: string[]; // immigration path keys
}

/** Drop near-duplicate candidates within the same batch, keeping the first (highest-ranked) one. */
export function dedupWithinBatch<T extends Candidate>(candidates: T[], threshold = TITLE_SIMILARITY_THRESHOLD): T[] {
  const kept: T[] = [];
  const seenKeys = new Set<string>();
  for (const c of candidates) {
    const key = dedupKeyFor(c);
    if (seenKeys.has(key)) continue;
    const tokens = tokenize(c.title);
    if (kept.some((k) => jaccard(tokens, tokenize(k.title)) >= threshold)) continue;
    seenKeys.add(key);
    kept.push(c);
  }
  return kept;
}

/** Score = recency (max 50) + source trust (max 30) + has a known immigration path (20). */
export function scoreCandidate(c: Candidate, now: Date): number {
  let recency = 10; // unknown date → small score
  if (c.publishedAt && !isNaN(c.publishedAt.getTime())) {
    const ageDays = Math.max(0, (now.getTime() - c.publishedAt.getTime()) / 86_400_000);
    recency = ageDays > 30 ? 0 : Math.round(50 * (1 - ageDays / 30));
  }
  const trust = Math.round((Math.min(Math.max(c.sourceTrust, 0), 100) / 100) * 30);
  const relevance = c.paths.length > 0 ? 20 : 0;
  return recency + trust + relevance;
}

/**
 * Rank candidates and order them so the first N cover different immigration
 * paths where possible (one per primary path first, then the rest by score).
 * Candidates with no recognised immigration path are dropped as off-topic.
 */
export function rankCandidates<T extends Candidate>(candidates: T[], now: Date): T[] {
  const scored = candidates
    .filter((c) => c.paths.length > 0)
    .map((c) => ({ c, s: scoreCandidate(c, now) }))
    .sort((a, b) => b.s - a.s || a.c.title.localeCompare(b.c.title));

  const firstPass: T[] = [];
  const rest: T[] = [];
  const usedPaths = new Set<string>();
  for (const { c } of scored) {
    const primary = c.paths[0];
    if (!usedPaths.has(primary)) {
      usedPaths.add(primary);
      firstPass.push(c);
    } else {
      rest.push(c);
    }
  }
  return [...firstPass, ...rest];
}

// ─── Same-event clustering ────────────────────────────────────────────────────
// Different sources word the same announcement differently ("Canada modernizes
// the asylum system" vs "IRCC changes asylum rules"), so the headline rule above
// misses them. Treat two candidates as one event when they share an immigration
// path, were published on the same or adjacent UTC day, and overlap ≥ 0.3.

export const SAME_EVENT_THRESHOLD = 0.3;
const DAY_MS = 86_400_000;

function utcDayNumber(d: Date | null): number | null {
  return d && !isNaN(d.getTime()) ? Math.floor(d.getTime() / DAY_MS) : null;
}

export function isSameEvent(a: Candidate, b: Candidate, threshold = SAME_EVENT_THRESHOLD): boolean {
  const da = utcDayNumber(a.publishedAt);
  const db = utcDayNumber(b.publishedAt);
  if (da === null || db === null || Math.abs(da - db) > 1) return false;
  if (!a.paths.some((p) => b.paths.includes(p))) return false;
  return jaccard(tokenize(a.title), tokenize(b.title)) >= threshold;
}

/**
 * Collapse same-event candidates, keeping the highest-trust source of each
 * event (ties keep the earlier one). Returns survivors in their original order
 * plus what was dropped and why.
 */
export function clusterSameEvents<T extends Candidate>(
  candidates: T[],
  threshold = SAME_EVENT_THRESHOLD
): { kept: T[]; dropped: { candidate: T; keptInstead: T }[] } {
  const order = candidates.map((c, i) => ({ c, i })).sort((x, y) => y.c.sourceTrust - x.c.sourceTrust || x.i - y.i);
  const kept: { c: T; i: number }[] = [];
  const dropped: { candidate: T; keptInstead: T }[] = [];
  for (const x of order) {
    const match = kept.find((k) => isSameEvent(k.c, x.c, threshold));
    if (match) dropped.push({ candidate: x.c, keptInstead: match.c });
    else kept.push(x);
  }
  return { kept: kept.sort((a, b) => a.i - b.i).map((k) => k.c), dropped };
}
