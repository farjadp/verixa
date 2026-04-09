// ============================================================================
// Hardware Source: src/components/analytics/PageViewTracker.tsx
// Route: Global (App Shell)
// Version: 1.0.0 — 2026-04-09
// Why: Captures every navigation event natively within Next.js App Router to track page views and traffic attribution.
// Domain: Usage Analytics
// Env / Identity: React Client Component
// Owner: Verixa Web
// Notes: Returns null so it is entirely invisible. Operates asynchronously to avoid blocking hydration.
// ============================================================================
"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackEvent } from "@/actions/analytics.actions";

export function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasTrackedInitialRender = useRef(false);
  const currentPath = useRef("");

  useEffect(() => {
    // Determine the full path to check for changes
    if (!pathname) return;
    const search = searchParams?.toString();
    const fullPath = search ? `${pathname}?${search}` : pathname;

    // Avoide duplicate tracking in React Strict Mode or fast re-renders
    if (currentPath.current === fullPath && hasTrackedInitialRender.current) {
      return;
    }
    
    currentPath.current = fullPath;
    hasTrackedInitialRender.current = true;

    // Extract UTM parameters if they exist
    const utmSource = searchParams?.get("utm_source") || undefined;
    const utmMedium = searchParams?.get("utm_medium") || undefined;
    const utmCampaign = searchParams?.get("utm_campaign") || undefined;
    const utmTerm = searchParams?.get("utm_term") || undefined;
    const utmContent = searchParams?.get("utm_content") || undefined;

    // Fire & forget
    trackEvent({
      eventName: "page_view",
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,
      referrer: document.referrer || undefined,
      metadata: {
        url: fullPath,
        userAgent: navigator.userAgent
      }
    });

  }, [pathname, searchParams]);

  return null;
}
