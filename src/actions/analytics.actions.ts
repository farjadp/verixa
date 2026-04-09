// ============================================================================
// Hardware Source: src/actions/analytics.actions.ts
// Route: /api/actions/analytics
// Version: 1.0.0 — 2026-04-09
// Why: Internal tracking engine for capturing platform usage, profile hits, and conversion events.
// Domain: Usage Analytics
// Env / Identity: React Server Actions
// Owner: Verixa Web
// Notes: Functions MUST fail silently to never block UI render/UX flow.
// ============================================================================
"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export interface TrackEventPayload {
  eventName: string;
  sessionId?: string;
  consultantId?: string;
  articleId?: string;
  source?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  referrer?: string;
  device?: string;
  city?: string;
  province?: string;
  country?: string;
  specialization?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Track a platform event. Never throws — analytics must never break UX.
 * Can be called from server actions or server components.
 */
export async function trackEvent(payload: TrackEventPayload): Promise<void> {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id ?? null;

    let sessionId = payload.sessionId;
    if (!sessionId) {
      const cookieStore = await cookies();
      const vidCookie = cookieStore.get("vx_visitor_id");
      if (vidCookie?.value) {
        sessionId = vidCookie.value;
      } else {
        // We can't easily write a new cookie in a server action without mutating the response,
        // so we'll just generate one for this specific isolated action if everything fails, 
        // though it won't persist to the browser.
        sessionId = `server_${Math.random().toString(36).substring(2, 10)}`;
      }
    }

    // Extrapolate IDs from the URL if not provided directly
    const urlContext = (payload.metadata as any)?.url || "";
    let consultantId = payload.consultantId;
    let articleId = payload.articleId;

    if (!consultantId && urlContext.includes("/consultant/")) {
      const match = urlContext.match(/\/consultant\/([^/?#]+)/);
      if (match && match[1]) {
        const identifier = match[1];
        const profile = await prisma.consultantProfile.findFirst({
          where: { OR: [{ slug: identifier }, { licenseNumber: identifier }] },
          select: { id: true },
        });
        if (profile) consultantId = profile.id;
      }
    }

    if (!articleId && urlContext.includes("/blog/")) {
      const match = urlContext.match(/\/blog\/([^/?#]+)/);
      if (match && match[1]) {
        const identifier = match[1];
        const post = await prisma.blogPost.findFirst({
          where: { slug: identifier },
          select: { id: true },
        });
        if (post) articleId = post.id;
      }
    }

    await prisma.analyticsEvent.create({
      data: {
        eventName:    payload.eventName,
        userId:       userId,
        sessionId:    sessionId,
        consultantId: consultantId ?? null,
        articleId:    articleId ?? null,
        source:       payload.source ?? null,
        utmSource:    payload.utmSource ?? null,
        utmMedium:    payload.utmMedium ?? null,
        utmCampaign:  payload.utmCampaign ?? null,
        utmContent:   payload.utmContent ?? null,
        utmTerm:      payload.utmTerm ?? null,
        referrer:     payload.referrer ?? null,
        device:       payload.device ?? null,
        city:         payload.city ?? null,
        province:     payload.province ?? null,
        country:      payload.country ?? null,
        specialization: payload.specialization ?? null,
        metadata:     payload.metadata ? JSON.stringify(payload.metadata) : null,
      },
    });

    // If it's a page_view for a Consultant, increment ConsultantDailySummary
    if (payload.eventName === "page_view" && consultantId) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0); // Start of UTC day
      
      await prisma.consultantDailySummary.upsert({
        where: {
          consultantProfileId_date: {
            consultantProfileId: consultantId,
            date: today,
          }
        },
        create: {
          consultantProfileId: consultantId,
          date: today,
          profileViews: 1,
        },
        update: {
          profileViews: { increment: 1 },
          updatedAt: new Date()
        }
      });
    }

  } catch (err) {
    // Silent fail — analytics must never interrupt the main user flow
    console.error("[Analytics] trackEvent failed:", err);
  }
}
