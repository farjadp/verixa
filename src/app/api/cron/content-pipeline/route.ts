// ============================================================================
// Route: /api/cron/content-pipeline  (scheduled daily in vercel.json)
// Why: Runs the content agent team: discovery → selection → writer → SEO →
//      reviewer → image → publisher.
// Security: Requires `Authorization: Bearer ${CRON_SECRET}` (Vercel Cron sends
//      it). Compared in constant time. No fallback secret: if CRON_SECRET is
//      unset the route refuses with 500.
// Safety: Idempotent and batch-limited (see orchestrator.ts). Creates DRAFT
//      posts + QUEUED social jobs unless content_autopublish_enabled = "true".
//      Never posts to social networks or sends email.
// ============================================================================
import { NextResponse } from "next/server";
import { runContentPipeline } from "@/lib/content-pipeline/orchestrator";
import { createDefaultDeps } from "@/lib/content-pipeline/default-deps";
import { isAuthorizedCronRequest } from "@/lib/content-pipeline/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[content-pipeline] CRON_SECRET is not configured; refusing to run.");
    return NextResponse.json({ error: "Cron is not configured." }, { status: 500 });
  }
  if (!isAuthorizedCronRequest(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const deps = await createDefaultDeps();
    const summary = await runContentPipeline(deps, { trigger: "CRON" });
    return NextResponse.json(summary, { status: summary.status === "FAILED" ? 500 : 200 });
  } catch (e) {
    console.error("[content-pipeline] cron run crashed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Pipeline run failed." }, { status: 500 });
  }
}
