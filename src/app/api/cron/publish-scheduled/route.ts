// ============================================================================
// Route: /api/cron/publish-scheduled
// Why: Publishes scheduled blog posts (isPublished=false, source="SCHEDULED")
//      whose publishedAt has passed.
// Security: Requires `Authorization: Bearer ${CRON_SECRET}`, compared in
//      constant time. No fallback secret.
// Safety: Idempotent. Only touches posts with source "SCHEDULED".
// ============================================================================
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isAuthorizedCronRequest } from "@/lib/content-pipeline/cron-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[publish-scheduled] CRON_SECRET is not configured; refusing to run.");
    return NextResponse.json({ error: "Cron is not configured." }, { status: 500 });
  }
  if (!isAuthorizedCronRequest(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const due = await prisma.blogPost.findMany({
      where: { isPublished: false, source: "SCHEDULED", publishedAt: { lte: now } },
      select: { id: true, slug: true },
    });
    for (const post of due) {
      await prisma.blogPost.update({ where: { id: post.id }, data: { isPublished: true } });
    }
    if (due.length > 0) {
      revalidatePath("/blog");
      revalidatePath("/sitemap.xml");
    }
    return NextResponse.json({ published: due.map((p) => p.slug) });
  } catch (e) {
    console.error("[publish-scheduled] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Publish run failed." }, { status: 500 });
  }
}
