// ============================================================================
// Agent 2 — Topic selection + dedup
// Drops candidates already handled (pipeline jobs, aggregator raw articles) or
// already covered by an existing BlogPost, ranks the rest with path diversity,
// and returns the top N plus a small backup buffer for rejected drafts.
// ============================================================================
import type { PipelineDeps } from "../types";
import { checkDuplicate, clusterSameEvents, dedupKeyFor, dedupWithinBatch, rankCandidates, type Candidate } from "../dedup";

export const EXISTING_POSTS_WINDOW = 500;
/** A FAILED job is retried automatically by later runs until it reaches this many attempts. */
export const MAX_JOB_ATTEMPTS = 3;

export interface SelectionResult {
  selected: Candidate[];
  skipped: { title: string; reason: string }[];
}

export async function selectTopics(
  deps: PipelineDeps,
  candidates: Candidate[],
  opts: { count: number; buffer?: number }
): Promise<SelectionResult> {
  const skipped: { title: string; reason: string }[] = [];
  if (candidates.length === 0 || opts.count <= 0) return { selected: [], skipped };

  const keys = candidates.map(dedupKeyFor);
  const urls = candidates.map((c) => c.sourceUrl).filter((u): u is string => !!u);

  const [jobs, raws, posts] = await Promise.all([
    deps.db.contentPipelineJob.findMany({
      where: { dedupKey: { in: keys } },
      select: { dedupKey: true, stage: true, attempts: true },
      take: keys.length,
    }),
    deps.db.rawArticle.findMany({
      where: { sourceUrl: { in: urls }, status: { in: ["PROCESSED", "GENERATING", "DUPLICATE", "IGNORED"] } },
      select: { sourceUrl: true },
      take: urls.length,
    }),
    deps.db.blogPost.findMany({
      select: { title: true, slug: true, targetKeyword: true },
      orderBy: { createdAt: "desc" },
      take: EXISTING_POSTS_WINDOW,
    }),
  ]);

  // FAILED jobs (transient errors, timeouts) stay eligible until they run out of attempts.
  const handledKeys = new Set(
    jobs.filter((j) => j.stage !== "FAILED" || j.attempts >= MAX_JOB_ATTEMPTS).map((j) => j.dedupKey)
  );
  const handledUrls = new Set(raws.map((r) => r.sourceUrl));

  const fresh: Candidate[] = [];
  for (const c of candidates) {
    if (handledKeys.has(dedupKeyFor(c))) continue; // silently: processed on an earlier run
    if (c.sourceUrl && handledUrls.has(c.sourceUrl)) {
      skipped.push({ title: c.title, reason: "already processed by the news aggregator" });
      continue;
    }
    const dup = checkDuplicate({ title: c.title }, posts);
    if (dup.duplicate) {
      skipped.push({ title: c.title, reason: `covered by /blog/${dup.matchedSlug} (${dup.reason})` });
      continue;
    }
    fresh.push(c);
  }

  const clustered = clusterSameEvents(fresh);
  for (const d of clustered.dropped) {
    skipped.push({ title: d.candidate.title, reason: `same event as "${d.keptInstead.title}" (${d.keptInstead.sourceName})` });
  }
  const ranked = dedupWithinBatch(rankCandidates(clustered.kept, deps.now()));
  const selected = ranked.slice(0, opts.count + (opts.buffer ?? 2));
  deps.log(`Selection: ${fresh.length} fresh, ${selected.length} selected, ${skipped.length} skipped as duplicates.`);
  return { selected, skipped };
}
