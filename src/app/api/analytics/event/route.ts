// ============================================================================
// Hardware Source: src/app/api/analytics/event/route.ts
// Route: /api/analytics/event
// Version: 1.0.0 — 2026-04-08
// Why: Telemetry ingestion endpoint for client-side analytics and funnel measurement.
// Domain: Telemetry & Analytics
// Env / Identity: Next.js Route Handler
// Owner: Verixa Web
// Notes: Keep the endpoint deterministic, authenticated where required, and resistant to provider/database failures.
// Critical Path: Client telemetry ingestion for analytics, funnel tracking, and product decisions.
// Primary Dependencies: Session lookup, event payload validation, analytics tables.
// Risk Notes: This endpoint should tolerate anonymous traffic and malformed payloads safely.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

/**
 * POST /api/analytics/event
 * Client-side event tracking endpoint. Used from useEffect hooks on public pages.
 * No auth required — anonymous users are tracked with null userId.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Resolve userId if session exists (no hard requirement)
    let userId: string | null = null;
    try {
      const session = await getServerSession(authOptions);
      userId = (session?.user as any)?.id ?? null;
    } catch {
      // ignore session errors — anonymous is fine
    }

    // Derive source from UTM or referrer
    const source = body.source ?? deriveSource(body.utmSource, body.referrer);

    await prisma.analyticsEvent.create({
      data: {
        eventName:      body.eventName ?? "unknown",
        userId,
        sessionId:      body.sessionId ?? null,
        consultantId:   body.consultantId ?? null,
        articleId:      body.articleId ?? null,
        source,
        utmSource:      body.utmSource ?? null,
        utmMedium:      body.utmMedium ?? null,
        utmCampaign:    body.utmCampaign ?? null,
        utmContent:     body.utmContent ?? null,
        utmTerm:        body.utmTerm ?? null,
        referrer:       body.referrer ?? null,
        device:         body.device ?? null,
        city:           body.city ?? null,
        province:       body.province ?? null,
        country:        body.country ?? null,
        specialization: body.specialization ?? null,
        metadata:       body.metadata ? JSON.stringify(body.metadata) : null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Analytics API] POST /api/analytics/event failed:", err);
    // Return 200 even on error — client should not retry/fail on analytics
    return NextResponse.json({ ok: false });
  }
}

function deriveSource(utmSource?: string, referrer?: string): string {
  if (utmSource) {
    const s = utmSource.toLowerCase();
    if (s.includes("google"))    return "google";
    if (s.includes("linkedin"))  return "linkedin";
    if (s.includes("telegram"))  return "telegram";
    if (s.includes("twitter") || s.includes("x.com")) return "twitter";
    return s;
  }
  if (referrer) {
    const r = referrer.toLowerCase();
    if (r.includes("google"))    return "google";
    if (r.includes("linkedin"))  return "linkedin";
    if (r.includes("t.me") || r.includes("telegram")) return "telegram";
    if (r.includes("twitter") || r.includes("x.com")) return "twitter";
  }
  return "direct";
}
