"use client";

import { useEffect } from "react";
import { useSearchParams, usePathname } from "next/navigation";

interface TrackPageViewProps {
  eventName: string;
  consultantId?: string;
  articleId?: string;
  specialization?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Client component that fires one analytics event on mount.
 * Reads UTM params from the URL automatically.
 * Use this as a lightweight child inside any server component page.
 */
export default function TrackPageView({
  eventName,
  consultantId,
  articleId,
  specialization,
  metadata,
}: TrackPageViewProps) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const utmSource   = searchParams.get("utm_source")   ?? undefined;
    const utmMedium   = searchParams.get("utm_medium")   ?? undefined;
    const utmCampaign = searchParams.get("utm_campaign") ?? undefined;
    const utmContent  = searchParams.get("utm_content")  ?? undefined;
    const utmTerm     = searchParams.get("utm_term")     ?? undefined;

    const device = getDevice();
    const referrer = document.referrer || undefined;
    const sessionId = getOrCreateVisitorId();

    fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName,
        consultantId,
        articleId,
        specialization,
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent,
        utmTerm,
        referrer,
        device,
        sessionId,
        metadata,
      }),
    }).catch(() => {
      // Silent fail — analytics must never break UX
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

function getOrCreateVisitorId() {
  if (typeof window === "undefined") return "unknown";
  let vid = localStorage.getItem("vx_visitor_id");
  if (!vid) {
    vid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    localStorage.setItem("vx_visitor_id", vid);
  }
  return vid;
}

function getDevice(): string {
  if (typeof window === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/mobile/i.test(ua))  return "mobile";
  if (/tablet/i.test(ua))  return "tablet";
  return "desktop";
}
