// ============================================================================
// Content Pipeline — orchestrator
// discovery → selection → (per topic) writer → seo → reviewer → image → publisher
//
// Safe to rerun:
//   - daily quota: stops once `content_pieces_per_day` drafts/posts exist today (UTC)
//   - run lock: PipelineRun.lockKey is unique, so only one run can hold "RUNNING"
//   - idempotency: ContentPipelineJob.dedupKey is unique per source URL/topic;
//     a job is claimed atomically (create, or take over a FAILED row), so an
//     item is never processed by two runs at once
//   - recovery: runs/jobs left mid-flight by a killed function are failed after
//     RUN_LOCK_MS; FAILED items retry automatically (up to MAX_JOB_ATTEMPTS)
//   - time budget: stops starting new topics before the function timeout
// ============================================================================
import { Prisma } from "@prisma/client";
import type { PipelineDeps } from "./types";
import { loadConfig, type PipelineConfig } from "./config";
import { checkDuplicate, dedupKeyFor, type Candidate } from "./dedup";
import { normalizePathKeys, tagImmigrationPaths } from "./paths";
import { discoverCandidates, extractMainText } from "./agents/discovery";
import { EXISTING_POSTS_WINDOW, MAX_JOB_ATTEMPTS, selectTopics } from "./agents/selection";
import { writeDraft } from "./agents/writer";
import { optimizeSeo } from "./agents/seo-agent";
import { reviewDraft } from "./agents/reviewer";
import { createCoverImage } from "./agents/image";
import { publishPiece } from "./agents/publisher";

export const RUN_LOCK_MS = 15 * 60 * 1000;
export const DEFAULT_TIME_BUDGET_MS = 240_000; // under Vercel's 300 s maxDuration
export const EST_MS_PER_PIECE = 75_000;
export const MIN_SOURCE_CHARS = 300;
export const PRODUCED_STAGES = ["READY", "PUBLISHED"];
export const RETRYABLE_STAGES = ["FAILED", "REJECTED"];
const LOCK_HELD = "RUNNING";

export interface RunSummary {
  status: "COMPLETED" | "SKIPPED" | "FAILED";
  reason?: string;
  runId?: string;
  produced: number;
  rejected: number;
  failed: number;
  discovered: number;
  selected: number;
  autopublish: boolean;
  log: string[];
}

export type Outcome = "produced" | "rejected" | "failed" | "skipped";

export function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function errMsg(e: unknown): string {
  return (e instanceof Error ? e.message : String(e)).slice(0, 500);
}

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

/** Clears every stage output so a reclaimed job starts from scratch. */
const RESET_OUTPUTS = {
  draftMarkdown: null,
  summary: null,
  outline: null,
  slug: null,
  targetKeyword: null,
  metaTitle: null,
  metaDesc: null,
  jsonLd: null,
  internalLinks: null,
  qualityScore: null,
  reviewNotes: null,
  rejectionReason: null,
  coverImage: null,
  imageAlt: null,
  blogPostId: null,
} satisfies Prisma.ContentPipelineJobUpdateManyMutationInput;

function candidateFields(c: Candidate, config: PipelineConfig) {
  return {
    topic: c.title.slice(0, 500),
    sourceUrl: c.sourceUrl,
    sourceName: c.sourceName,
    sourceId: c.sourceId ?? null,
    sourcePublishedAt: c.publishedAt,
    snippet: c.snippet ? c.snippet.slice(0, 1000) : null,
    immigrationPaths: JSON.stringify(c.paths),
    language: config.language.raw,
  };
}

/**
 * Atomically claim a candidate. Creates its job, or — when a FAILED job for the
 * same item exists with attempts left — takes that row over. Returns null when
 * the item is done or another run holds it. The conditional updateMany is the
 * claim: Postgres re-checks `stage = FAILED` under the row lock, so two runs
 * can't both win.
 */
async function claimJob(deps: PipelineDeps, c: Candidate, config: PipelineConfig, runId: string): Promise<string | null> {
  const { db } = deps;
  const dedupKey = dedupKeyFor(c);
  try {
    const job = await db.contentPipelineJob.create({
      data: { pipelineRunId: runId, dedupKey, stage: "SELECTED", ...candidateFields(c, config) },
      select: { id: true },
    });
    return job.id;
  } catch (e) {
    if (!isUniqueViolation(e)) throw e;
  }
  const claimed = await db.contentPipelineJob.updateMany({
    where: { dedupKey, stage: "FAILED", attempts: { lt: MAX_JOB_ATTEMPTS } },
    data: {
      ...RESET_OUTPUTS,
      ...candidateFields(c, config),
      pipelineRunId: runId,
      stage: "SELECTED",
      status: "ACTIVE",
      attempts: { increment: 1 },
    },
  });
  if (claimed.count !== 1) return null;
  const job = await db.contentPipelineJob.findUnique({ where: { dedupKey }, select: { id: true } });
  return job?.id ?? null;
}

/** Run every stage for one claimed job, recording progress on its ContentPipelineJob. */
async function runStages(deps: PipelineDeps, jobId: string, c: Candidate, config: PipelineConfig): Promise<Outcome> {
  const { db } = deps;
  const stage = (s: string, data: Prisma.ContentPipelineJobUpdateInput = {}) =>
    db.contentPipelineJob.update({ where: { id: jobId }, data: { stage: s, ...data } });

  try {
    // Source text for the writer and reviewer. Falls back to the feed snippet.
    await stage("WRITING");
    let sourceText = "";
    if (c.sourceUrl) {
      try {
        sourceText = extractMainText(await deps.fetchHtml(c.sourceUrl));
      } catch (e) {
        deps.log(`Source fetch failed for ${c.sourceUrl}: ${errMsg(e)}`);
      }
    }
    if (sourceText.length < MIN_SOURCE_CHARS) sourceText = [c.title, c.snippet, sourceText].filter(Boolean).join("\n\n");
    if (sourceText.length < 200) {
      await stage("FAILED", { status: "ERROR", rejectionReason: "Source text unavailable or too short to write from." });
      return "failed";
    }

    const draft = await writeDraft(deps, { candidate: c, sourceText, language: config.language });

    // Second dedup pass on what was actually written: different sources describe
    // the same event in different words, and the draft's title/keyword are normalized.
    const existing = await db.blogPost.findMany({
      select: { title: true, slug: true, targetKeyword: true },
      orderBy: { createdAt: "desc" },
      take: EXISTING_POSTS_WINDOW,
    });
    const dup = checkDuplicate({ title: draft.title, keyword: draft.targetKeyword }, existing);
    if (dup.duplicate) {
      await stage("SKIPPED_DUPLICATE", {
        status: "DONE",
        summary: draft.summary,
        rejectionReason: `Draft duplicates /blog/${dup.matchedSlug} (${dup.reason}).`,
      });
      deps.log(`Skipped "${draft.title}": duplicates /blog/${dup.matchedSlug}.`);
      return "skipped";
    }

    await stage("SEO", {
      summary: draft.summary,
      outline: JSON.stringify(draft.outline),
      immigrationPaths: JSON.stringify(draft.immigrationPaths),
    });

    const seo = await optimizeSeo(deps, { draft, sourceName: c.sourceName, sourceUrl: c.sourceUrl, language: config.language });
    await stage("REVIEW", {
      draftMarkdown: seo.markdown,
      slug: seo.slug,
      targetKeyword: seo.targetKeyword,
      metaTitle: seo.metaTitle,
      metaDesc: seo.metaDesc,
      jsonLd: JSON.stringify(seo.jsonLd),
      internalLinks: JSON.stringify(seo.internalLinks),
      imageAlt: seo.imageAlt,
    });

    const review = await reviewDraft(deps, {
      markdown: seo.markdown,
      keyFacts: draft.keyFacts,
      sourceText,
      sourceUrls: draft.citations.map((x) => x.url),
      language: config.language,
      strictness: config.strictness,
      minScore: config.minQualityScore,
    });
    const reviewNotes = JSON.stringify({
      passed: review.passed,
      flags: review.flags,
      claims: review.claims,
      checks: review.checks,
      editorNote: review.editorNote,
      // Kept so an admin override can publish without calling the LLM again.
      title: draft.title,
      keywords: seo.keywords,
      citations: draft.citations.map((x) => x.url),
      imagePrompt: draft.imagePrompt,
    });

    if (!review.passed) {
      await stage("REJECTED", {
        status: "DONE",
        draftMarkdown: review.markdown,
        qualityScore: review.score,
        reviewNotes,
        rejectionReason: `Reviewer gate (${config.strictness}, min ${config.minQualityScore}): ${review.flags.slice(0, 3).join(" | ") || "score too low"}`.slice(0, 1000),
      });
      deps.log(`Rejected "${draft.title}" (score ${review.score}).`);
      return "rejected";
    }

    await stage("IMAGE", { draftMarkdown: review.markdown, qualityScore: review.score, reviewNotes });
    let coverImage: string | null = null;
    let imageAlt = seo.imageAlt;
    if (config.imagesEnabled) {
      const image = await createCoverImage(deps, { subject: draft.imagePrompt, alt: seo.imageAlt });
      if (image.error) deps.log(`Image skipped for "${draft.title}": ${image.error}`);
      coverImage = image.url;
      imageAlt = image.alt;
    } else {
      deps.log(`Image generation disabled (content_images_enabled=false) for "${draft.title}".`);
    }

    const published = await publishPiece(deps, {
      title: draft.title,
      slug: seo.slug,
      summary: draft.summary,
      markdown: review.markdown,
      metaTitle: seo.metaTitle,
      metaDesc: seo.metaDesc,
      targetKeyword: seo.targetKeyword,
      keywords: seo.keywords,
      coverImage,
      imageAlt,
      imagePrompt: draft.imagePrompt,
      immigrationPaths: draft.immigrationPaths,
      citations: draft.citations.map((x) => x.url),
      reviewScore: review.score,
      language: config.language.primary.code,
      sourceId: c.sourceId,
      sourceUrl: c.sourceUrl,
      sourceTitle: c.title,
      publishLive: config.autopublish,
      channels: config.channels,
    });

    await stage(published.isPublished ? "PUBLISHED" : "READY", {
      status: "DONE",
      coverImage,
      blogPostId: published.blogPostId,
    });
    return "produced";
  } catch (e) {
    await stage("FAILED", { status: "ERROR", rejectionReason: errMsg(e) }).catch(() => null);
    deps.log(`Failed "${c.title}": ${errMsg(e)}`);
    return "failed";
  }
}

/**
 * Fail runs and jobs a killed function left behind. A run older than the lock
 * window that is still RUNNING has died; so has any ACTIVE job of such a run, or
 * any ACTIVE job not touched within the window (stage updates bump updatedAt).
 */
async function recoverStale(deps: PipelineDeps, now: Date): Promise<void> {
  const { db } = deps;
  const cutoff = new Date(now.getTime() - RUN_LOCK_MS);
  const staleRuns = await db.pipelineRun.findMany({
    where: { status: "RUNNING", startedAt: { lt: cutoff } },
    select: { id: true },
    take: 50,
  });
  const staleIds = staleRuns.map((r) => r.id);
  const timedOut = { stage: "FAILED", status: "ERROR", rejectionReason: "Run timed out" };

  if (staleIds.length) {
    await db.pipelineRun.updateMany({
      where: { id: { in: staleIds } },
      data: { status: "FAILED", lockKey: null, error: "Run did not finish (timed out).", finishedAt: now },
    });
    await db.contentPipelineJob.updateMany({ where: { pipelineRunId: { in: staleIds }, status: "ACTIVE" }, data: timedOut });
  }
  await db.contentPipelineJob.updateMany({ where: { status: "ACTIVE", updatedAt: { lt: cutoff } }, data: timedOut });
}

export async function runContentPipeline(
  deps: PipelineDeps,
  opts: { trigger: "CRON" | "MANUAL"; timeBudgetMs?: number } = { trigger: "CRON" }
): Promise<RunSummary> {
  const { db } = deps;
  const started = Date.now();
  const budget = opts.timeBudgetMs ?? DEFAULT_TIME_BUDGET_MS;
  const log: string[] = [];
  const say = (m: string) => {
    log.push(m);
    deps.log(m);
  };
  const empty = (status: RunSummary["status"], reason: string, autopublish: boolean): RunSummary => ({
    status, reason, produced: 0, rejected: 0, failed: 0, discovered: 0, selected: 0, autopublish, log,
  });

  const config = await loadConfig(db);
  const now = deps.now();

  // 1. Daily quota
  const producedToday = await db.contentPipelineJob.count({
    where: { stage: { in: PRODUCED_STAGES }, createdAt: { gte: startOfUtcDay(now) } },
  });
  const remaining = config.piecesPerDay - producedToday;
  if (remaining <= 0) return empty("SKIPPED", `Daily quota met (${producedToday}/${config.piecesPerDay}).`, config.autopublish);

  // 2. Recover anything a killed run left behind, then take the lock atomically.
  await recoverStale(deps, now);
  let runId: string;
  try {
    const run = await db.pipelineRun.create({
      data: {
        trigger: opts.trigger,
        lockKey: LOCK_HELD,
        language: config.language.raw,
        targetCount: remaining,
        autoPublished: config.autopublish,
      },
      select: { id: true },
    });
    runId = run.id;
  } catch (e) {
    if (isUniqueViolation(e)) return empty("SKIPPED", "Another pipeline run is in progress.", config.autopublish);
    throw e;
  }

  const summary: RunSummary = {
    status: "COMPLETED",
    runId,
    produced: 0,
    rejected: 0,
    failed: 0,
    discovered: 0,
    selected: 0,
    autopublish: config.autopublish,
    log,
  };

  try {
    say(`Run ${runId}: target ${remaining} piece(s), language ${config.language.raw}, autopublish ${config.autopublish ? "ON" : "OFF"}, images ${config.imagesEnabled ? "ON" : "OFF"}.`);

    const discovery = await discoverCandidates(deps);
    summary.discovered = discovery.candidates.length;
    for (const e of discovery.errors) say(`Source error — ${e}`);

    const selection = await selectTopics(deps, discovery.candidates, { count: remaining });
    summary.selected = selection.selected.length;
    for (const s of selection.skipped.slice(0, 10)) say(`Skipped duplicate: "${s.title}" — ${s.reason}`);

    for (const candidate of selection.selected) {
      if (summary.produced >= remaining) break;
      if (Date.now() - started + EST_MS_PER_PIECE > budget) {
        say("Time budget reached; remaining topics wait for the next run.");
        break;
      }
      const jobId = await claimJob(deps, candidate, config, runId);
      if (!jobId) continue; // done already, or another run is on it
      const outcome = await runStages(deps, jobId, candidate, config);
      if (outcome === "produced") summary.produced++;
      else if (outcome === "rejected") summary.rejected++;
      else if (outcome === "failed") summary.failed++;
    }

    if (summary.selected === 0) say("No new topics found in enabled sources.");
    say(`Done: ${summary.produced} produced, ${summary.rejected} rejected, ${summary.failed} failed.`);
  } catch (e) {
    summary.status = "FAILED";
    summary.reason = errMsg(e);
    say(`Run failed: ${summary.reason}`);
  } finally {
    // Always release the lock; if this write itself fails, recoverStale frees it later.
    await db.pipelineRun
      .update({
        where: { id: runId },
        data: {
          status: summary.status,
          lockKey: null,
          discovered: summary.discovered,
          selected: summary.selected,
          published: summary.produced,
          skipped: summary.rejected,
          failed: summary.failed,
          error: summary.reason ?? null,
          log: JSON.stringify(log.slice(-100)),
          finishedAt: deps.now(),
        },
      })
      .catch((e) => deps.log(`Could not finalize run ${runId}: ${errMsg(e)}`));
  }

  return summary;
}

export interface SingleSourceInput {
  url: string;
  title: string;
  sourceName: string;
  publishedAt: Date | null;
  sourceTrust?: number;
}

/**
 * Run every stage for one source URL an admin picked, bypassing discovery and
 * the daily quota. Uses the same run lock, job claim (so a URL is never written
 * twice) and gates as the scheduled run; autopublish/channels come from config.
 */
export async function runSingleSource(deps: PipelineDeps, input: SingleSourceInput): Promise<RunSummary> {
  const { db } = deps;
  const log: string[] = [];
  const say = (m: string) => {
    log.push(m);
    deps.log(m);
  };
  const config = await loadConfig(db);
  const now = deps.now();
  const base: RunSummary = {
    status: "COMPLETED", produced: 0, rejected: 0, failed: 0, discovered: 1, selected: 0, autopublish: config.autopublish, log,
  };

  await recoverStale(deps, now);
  let runId: string;
  try {
    const run = await db.pipelineRun.create({
      data: { trigger: "MANUAL", lockKey: LOCK_HELD, language: config.language.raw, targetCount: 1, autoPublished: config.autopublish },
      select: { id: true },
    });
    runId = run.id;
  } catch (e) {
    if (isUniqueViolation(e)) return { ...base, status: "SKIPPED", reason: "Another pipeline run is in progress." };
    throw e;
  }
  const summary: RunSummary = { ...base, runId };

  try {
    const candidate: Candidate = {
      title: input.title,
      sourceUrl: input.url,
      sourceName: input.sourceName,
      sourceTrust: input.sourceTrust ?? 100,
      publishedAt: input.publishedAt,
      snippet: "",
      paths: tagImmigrationPaths(input.title),
    };
    say(`Run ${runId}: single source "${input.title}" (${input.url}), autopublish ${config.autopublish ? "ON" : "OFF"}.`);
    const jobId = await claimJob(deps, candidate, config, runId);
    if (!jobId) {
      summary.status = "SKIPPED";
      summary.reason = "This source was already processed (or is being processed).";
      say(summary.reason);
    } else {
      summary.selected = 1;
      const outcome = await runStages(deps, jobId, candidate, config);
      if (outcome === "produced") summary.produced++;
      else if (outcome === "rejected") summary.rejected++;
      else if (outcome === "failed") summary.failed++;
      say(`Done: ${outcome} (job ${jobId}).`);
    }
  } catch (e) {
    summary.status = "FAILED";
    summary.reason = errMsg(e);
    say(`Run failed: ${summary.reason}`);
  } finally {
    await db.pipelineRun
      .update({
        where: { id: runId },
        data: {
          status: summary.status,
          lockKey: null,
          discovered: summary.discovered,
          selected: summary.selected,
          published: summary.produced,
          skipped: summary.rejected,
          failed: summary.failed,
          error: summary.reason ?? null,
          log: JSON.stringify(log.slice(-100)),
          finishedAt: deps.now(),
        },
      })
      .catch((e) => deps.log(`Could not finalize run ${runId}: ${errMsg(e)}`));
  }
  return summary;
}

/**
 * Admin retry of one FAILED or reviewer-REJECTED job (no post yet). Ignores the
 * auto-retry cap and the daily quota. The claim is atomic, so a job a cron run
 * is processing can't be retried at the same time.
 */
export async function retryJob(deps: PipelineDeps, jobId: string): Promise<{ ok: true; outcome: Outcome } | { ok: false; error: string }> {
  const { db } = deps;
  const config = await loadConfig(db);
  const claimed = await db.contentPipelineJob.updateMany({
    where: { id: jobId, stage: { in: RETRYABLE_STAGES }, blogPostId: null },
    data: { ...RESET_OUTPUTS, stage: "SELECTED", status: "ACTIVE", language: config.language.raw, attempts: { increment: 1 } },
  });
  if (claimed.count !== 1) return { ok: false, error: "Only failed or reviewer-rejected jobs without a post can be retried." };

  const job = await db.contentPipelineJob.findUnique({ where: { id: jobId } });
  if (!job) return { ok: false, error: "Job not found." };

  let paths: unknown = [];
  try {
    paths = job.immigrationPaths ? JSON.parse(job.immigrationPaths) : [];
  } catch {
    /* keep [] */
  }
  const candidate: Candidate = {
    title: job.topic,
    sourceId: job.sourceId ?? undefined,
    sourceUrl: job.sourceUrl,
    sourceName: job.sourceName || "Source",
    sourceTrust: 100,
    publishedAt: job.sourcePublishedAt,
    snippet: job.snippet || "",
    paths: normalizePathKeys(paths),
  };
  deps.log(`Admin retry of job ${jobId} ("${job.topic}").`);
  return { ok: true, outcome: await runStages(deps, jobId, candidate, config) };
}
