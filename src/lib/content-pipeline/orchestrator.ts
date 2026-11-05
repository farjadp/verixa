// ============================================================================
// Content Pipeline — orchestrator
// discovery → selection → (per topic) writer → seo → reviewer → image → publisher
//
// Safe to rerun:
//   - daily quota: stops once `content_pieces_per_day` drafts/posts exist today (UTC)
//   - run lock: skips while another run started < 15 min ago is RUNNING
//   - idempotency: ContentPipelineJob.dedupKey is unique per source URL/topic,
//     so an item is never processed twice, even by overlapping runs
//   - time budget: stops starting new topics before the function timeout
// ============================================================================
import { Prisma } from "@prisma/client";
import type { PipelineDeps } from "./types";
import { loadConfig, type PipelineConfig } from "./config";
import { dedupKeyFor, type Candidate } from "./dedup";
import { discoverCandidates, extractMainText } from "./agents/discovery";
import { selectTopics } from "./agents/selection";
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

export function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function errMsg(e: unknown): string {
  return (e instanceof Error ? e.message : String(e)).slice(0, 500);
}

type Outcome = "produced" | "rejected" | "failed" | "skipped";

/** Run every stage for one selected topic, recording progress on its ContentPipelineJob. */
async function processCandidate(
  deps: PipelineDeps,
  c: Candidate,
  config: PipelineConfig,
  runId: string
): Promise<Outcome> {
  const { db } = deps;
  let jobId: string;
  try {
    const job = await db.contentPipelineJob.create({
      data: {
        pipelineRunId: runId,
        dedupKey: dedupKeyFor(c),
        stage: "SELECTED",
        topic: c.title.slice(0, 500),
        sourceUrl: c.sourceUrl,
        sourceName: c.sourceName,
        immigrationPaths: JSON.stringify(c.paths),
        language: config.language.raw,
      },
      select: { id: true },
    });
    jobId = job.id;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return "skipped"; // another run took it
    throw e;
  }

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
      sourceId: c.sourceId ?? null,
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
    const image = await createCoverImage(deps, { subject: draft.imagePrompt, alt: seo.imageAlt });
    if (image.error) deps.log(`Image skipped for "${draft.title}": ${image.error}`);

    const published = await publishPiece(deps, {
      title: draft.title,
      slug: seo.slug,
      summary: draft.summary,
      markdown: review.markdown,
      metaTitle: seo.metaTitle,
      metaDesc: seo.metaDesc,
      targetKeyword: seo.targetKeyword,
      keywords: seo.keywords,
      coverImage: image.url,
      imageAlt: image.alt,
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
      coverImage: image.url,
      blogPostId: published.blogPostId,
    });
    return "produced";
  } catch (e) {
    await stage("FAILED", { status: "ERROR", rejectionReason: errMsg(e) }).catch(() => null);
    deps.log(`Failed "${c.title}": ${errMsg(e)}`);
    return "failed";
  }
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

  // 2. Run lock (stale RUNNING rows are closed out first)
  const lockCutoff = new Date(now.getTime() - RUN_LOCK_MS);
  await db.pipelineRun.updateMany({
    where: { status: "RUNNING", startedAt: { lt: lockCutoff } },
    data: { status: "FAILED", error: "Run did not finish (timed out).", finishedAt: now },
  });
  const active = await db.pipelineRun.findFirst({ where: { status: "RUNNING" }, select: { id: true } });
  if (active) return empty("SKIPPED", "Another pipeline run is in progress.", config.autopublish);

  const run = await db.pipelineRun.create({
    data: { trigger: opts.trigger, language: config.language.raw, targetCount: remaining, autoPublished: config.autopublish },
    select: { id: true },
  });

  const summary: RunSummary = {
    status: "COMPLETED",
    runId: run.id,
    produced: 0,
    rejected: 0,
    failed: 0,
    discovered: 0,
    selected: 0,
    autopublish: config.autopublish,
    log,
  };

  try {
    say(`Run ${run.id}: target ${remaining} piece(s), language ${config.language.raw}, autopublish ${config.autopublish ? "ON" : "OFF"}.`);

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
      const outcome = await processCandidate(deps, candidate, config, run.id);
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
  }

  await db.pipelineRun.update({
    where: { id: run.id },
    data: {
      status: summary.status,
      discovered: summary.discovered,
      selected: summary.selected,
      published: summary.produced,
      skipped: summary.rejected,
      failed: summary.failed,
      error: summary.reason ?? null,
      log: JSON.stringify(log.slice(-100)),
      finishedAt: deps.now(),
    },
  });

  return summary;
}
