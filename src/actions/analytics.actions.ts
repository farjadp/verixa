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

    await prisma.analyticsEvent.create({
      data: {
        eventName:    payload.eventName,
        userId:       userId,
        sessionId:    sessionId,
        consultantId: payload.consultantId ?? null,
        articleId:    payload.articleId ?? null,
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
  } catch (err) {
    // Silent fail — analytics must never interrupt the main user flow
    console.error("[Analytics] trackEvent failed:", err);
  }
}
