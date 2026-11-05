// ============================================================================
// Server Actions: Content Pipeline admin
// Every action: requireAdmin() → zod-validated input → capped queries → audit log.
// No action here posts to social networks or sends email. Approving a draft
// publishes the BlogPost only; its SocialJob stays QUEUED for the Social hub.
// ============================================================================
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import { logEvent } from "@/lib/logger";
import {
  CHANNELS,
  ConfigUpdateSchema,
  configUpdateToSettings,
  loadConfig,
  type ConfigUpdate,
} from "@/lib/content-pipeline/config";
import { runContentPipeline, startOfUtcDay, PRODUCED_STAGES, type RunSummary } from "@/lib/content-pipeline/orchestrator";
import { createDefaultDeps } from "@/lib/content-pipeline/default-deps";
import { publishPiece } from "@/lib/content-pipeline/agents/publisher";
import { uniqueSlug } from "@/lib/content-pipeline/seo";
import { normalizePathKeys } from "@/lib/content-pipeline/paths";

const IdSchema = z.string().regex(/^c[a-z0-9]{20,32}$/, "Invalid id");
const ReasonSchema = z.string().trim().max(500).optional();

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

function fail(e: unknown): ActionResult {
  if (e instanceof z.ZodError) return { ok: false, error: e.issues.map((i) => i.message).join("; ") };
  return { ok: false, error: e instanceof Error ? e.message : "Unexpected error" };
}

function parseJson<T>(s: string | null, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function refresh() {
  revalidatePath("/dashboard/admin/content-pipeline");
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getContentPipelineDashboard() {
  await requireAdmin();
  const config = await loadConfig(prisma);
  const now = new Date();

  const [runs, jobs, sources, producedToday] = await Promise.all([
    prisma.pipelineRun.findMany({ orderBy: { startedAt: "desc" }, take: 15 }),
    prisma.contentPipelineJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 60,
      select: {
        id: true, stage: true, status: true, topic: true, sourceUrl: true, sourceName: true,
        immigrationPaths: true, language: true, summary: true, slug: true, targetKeyword: true,
        metaTitle: true, metaDesc: true, qualityScore: true, reviewNotes: true, rejectionReason: true,
        coverImage: true, imageAlt: true, blogPostId: true, draftMarkdown: true, createdAt: true,
      },
    }),
    prisma.contentSource.findMany({
      orderBy: [{ enabled: "desc" }, { trustScore: "desc" }],
      take: 50,
      select: { id: true, name: true, url: true, type: true, enabled: true, trustScore: true, lastCheckedAt: true },
    }),
    prisma.contentPipelineJob.count({ where: { stage: { in: PRODUCED_STAGES }, createdAt: { gte: startOfUtcDay(now) } } }),
  ]);

  const settings: ConfigUpdate = {
    language: config.language.raw,
    piecesPerDay: config.piecesPerDay,
    autopublish: config.autopublish,
    strictness: config.strictness,
    channels: config.channels,
  };

  return {
    settings,
    minQualityScore: config.minQualityScore,
    producedToday,
    // Booleans only — never return secret values to the client.
    env: { openai: !!process.env.OPENAI_API_KEY, cronSecret: !!process.env.CRON_SECRET, siteUrl: process.env.NEXT_PUBLIC_APP_URL || null },
    runs: runs.map((r) => ({ ...r, log: parseJson<string[]>(r.log, []) })),
    jobs: jobs.map((j) => ({
      ...j,
      immigrationPaths: parseJson<string[]>(j.immigrationPaths, []),
      reviewNotes: parseJson<{ flags?: string[]; editorNote?: string; claims?: { claim: string; verdict: string; note: string }[] } | null>(j.reviewNotes, null),
    })),
    sources,
  };
}

export type ContentPipelineDashboard = Awaited<ReturnType<typeof getContentPipelineDashboard>>;

// ─── Config ───────────────────────────────────────────────────────────────────

export async function updateContentPipelineConfig(input: unknown): Promise<ActionResult> {
  try {
    const { userId } = await requireAdmin();
    const parsed = ConfigUpdateSchema.parse(input);
    const rows = configUpdateToSettings(parsed);
    await prisma.$transaction(
      rows.map((r) => prisma.platformSetting.upsert({ where: { key: r.key }, update: { value: r.value }, create: r }))
    );
    await logEvent({ userId, role: "ADMIN", action: "CONTENT_PIPELINE_CONFIG_UPDATED", details: parsed });
    refresh();
    return { ok: true, message: parsed.autopublish ? "Saved. Auto-publish is ON: passing drafts will go live." : "Saved. Auto-publish is OFF: drafts wait for your approval." };
  } catch (e) {
    return fail(e);
  }
}

export async function setContentSourceEnabled(sourceId: unknown, enabled: unknown): Promise<ActionResult> {
  try {
    const { userId } = await requireAdmin();
    const id = IdSchema.parse(sourceId);
    const on = z.boolean().parse(enabled);
    await prisma.contentSource.update({ where: { id }, data: { enabled: on } });
    await logEvent({ userId, role: "ADMIN", action: "CONTENT_SOURCE_TOGGLED", details: { id, enabled: on } });
    refresh();
    return { ok: true, message: on ? "Source enabled." : "Source disabled." };
  } catch (e) {
    return fail(e);
  }
}

// ─── Run ──────────────────────────────────────────────────────────────────────

export async function runContentPipelineNow(): Promise<{ ok: true; summary: RunSummary } | { ok: false; error: string }> {
  try {
    const { userId } = await requireAdmin();
    if (!process.env.OPENAI_API_KEY) return { ok: false, error: "OPENAI_API_KEY is not configured on the server." };
    const summary = await runContentPipeline(await createDefaultDeps(), { trigger: "MANUAL" });
    await logEvent({
      userId, role: "ADMIN", action: "CONTENT_PIPELINE_MANUAL_RUN",
      details: { status: summary.status, reason: summary.reason, produced: summary.produced, runId: summary.runId },
    });
    refresh();
    return { ok: true, summary };
  } catch (e) {
    const r = fail(e);
    return { ok: false, error: r.ok ? "Unexpected error" : r.error };
  }
}

// ─── Review decisions ─────────────────────────────────────────────────────────

/** Publish a READY draft. The social job is left QUEUED (not sent). */
export async function approvePipelineJob(jobId: unknown): Promise<ActionResult> {
  try {
    const { userId } = await requireAdmin();
    const id = IdSchema.parse(jobId);
    const job = await prisma.contentPipelineJob.findUnique({ where: { id }, select: { stage: true, blogPostId: true, slug: true } });
    if (!job) return { ok: false, error: "Job not found." };
    if (job.stage !== "READY" || !job.blogPostId) return { ok: false, error: `Only READY drafts can be approved (this one is ${job.stage}).` };

    const now = new Date();
    await prisma.$transaction([
      prisma.blogPost.update({ where: { id: job.blogPostId }, data: { isPublished: true, publishedAt: now } }),
      prisma.contentPipelineJob.update({ where: { id }, data: { stage: "PUBLISHED" } }),
    ]);
    await logEvent({ userId, role: "ADMIN", action: "CONTENT_PIPELINE_APPROVED", details: { jobId: id, blogPostId: job.blogPostId } });
    for (const p of ["/", "/blog", `/blog/${job.slug}`, "/sitemap.xml"]) revalidatePath(p);
    refresh();
    return { ok: true, message: "Published. Its social posts are queued in Social Publishing (not sent)." };
  } catch (e) {
    return fail(e);
  }
}

/** Reject a READY draft or take down a PUBLISHED post. Cancels its queued social job. */
export async function rejectPipelineJob(jobId: unknown, reason?: unknown): Promise<ActionResult> {
  try {
    const { userId } = await requireAdmin();
    const id = IdSchema.parse(jobId);
    const why = ReasonSchema.parse(reason) || "Rejected by admin.";
    const job = await prisma.contentPipelineJob.findUnique({ where: { id }, select: { stage: true, blogPostId: true, slug: true } });
    if (!job) return { ok: false, error: "Job not found." };
    if (!["READY", "PUBLISHED", "REVIEW"].includes(job.stage)) return { ok: false, error: `Can't reject a ${job.stage} job.` };

    await prisma.$transaction(async (tx) => {
      if (job.blogPostId) {
        await tx.blogPost.update({ where: { id: job.blogPostId }, data: { isPublished: false } });
        await tx.socialJob.updateMany({ where: { blogPostId: job.blogPostId, status: "QUEUED" }, data: { status: "CANCELLED" } });
      }
      await tx.contentPipelineJob.update({ where: { id }, data: { stage: "REJECTED", status: "DONE", rejectionReason: why } });
    });
    await logEvent({ userId, role: "ADMIN", action: "CONTENT_PIPELINE_REJECTED", details: { jobId: id, reason: why, wasPublished: job.stage === "PUBLISHED" } });
    if (job.stage === "PUBLISHED") for (const p of ["/", "/blog", `/blog/${job.slug}`, "/sitemap.xml"]) revalidatePath(p);
    refresh();
    return { ok: true, message: job.stage === "PUBLISHED" ? "Post unpublished and its queued social job cancelled." : "Draft rejected." };
  } catch (e) {
    return fail(e);
  }
}

/** Turn a reviewer-rejected draft into an unpublished BlogPost so an editor can fix it in the Blog Engine. */
export async function overrideRejectedJob(jobId: unknown): Promise<ActionResult> {
  try {
    const { userId } = await requireAdmin();
    const id = IdSchema.parse(jobId);
    const job = await prisma.contentPipelineJob.findUnique({ where: { id } });
    if (!job) return { ok: false, error: "Job not found." };
    if (job.stage !== "REJECTED" || job.blogPostId) return { ok: false, error: "Only reviewer-rejected drafts without a post can be overridden." };
    if (!job.draftMarkdown || !job.slug || !job.metaTitle || !job.metaDesc) return { ok: false, error: "This job has no complete draft to keep." };

    const notes = parseJson<{ title?: string; keywords?: string[]; citations?: string[]; imagePrompt?: string; sourceId?: string | null }>(job.reviewNotes, {});
    const taken = await prisma.blogPost.findMany({ where: { slug: { startsWith: job.slug } }, select: { slug: true }, take: 100 });
    const slug = uniqueSlug(job.slug, new Set(taken.map((t) => t.slug)));
    const config = await loadConfig(prisma);
    const deps = await createDefaultDeps();

    const published = await publishPiece(deps, {
      title: notes.title || job.topic,
      slug,
      summary: job.summary || job.metaDesc,
      markdown: job.draftMarkdown,
      metaTitle: job.metaTitle,
      metaDesc: job.metaDesc,
      targetKeyword: job.targetKeyword || "",
      keywords: notes.keywords || [],
      coverImage: job.coverImage,
      imageAlt: job.imageAlt || notes.title || job.topic,
      imagePrompt: notes.imagePrompt || null,
      immigrationPaths: normalizePathKeys(parseJson<string[]>(job.immigrationPaths, [])),
      citations: notes.citations || [],
      reviewScore: job.qualityScore ?? 0,
      language: config.language.primary.code,
      sourceId: notes.sourceId || undefined,
      sourceUrl: job.sourceUrl,
      sourceTitle: job.topic,
      publishLive: false, // always a draft — an editor must fix and publish it
      channels: Object.fromEntries(CHANNELS.map((c) => [c, false])) as Record<(typeof CHANNELS)[number], boolean>,
    });

    await prisma.contentPipelineJob.update({ where: { id }, data: { stage: "READY", status: "DONE", slug, blogPostId: published.blogPostId } });
    await logEvent({ userId, role: "ADMIN", action: "CONTENT_PIPELINE_OVERRIDE", details: { jobId: id, blogPostId: published.blogPostId } });
    refresh();
    return { ok: true, message: "Saved as an unpublished draft. Review the flagged claims in the Blog Engine before publishing." };
  } catch (e) {
    return fail(e);
  }
}
