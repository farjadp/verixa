// ============================================================================
// Hardware Source: src/app/api/assets/logo/route.ts
// Route: /api/assets/logo
// Version: 1.0.0 — 2026-04-08
// Why: Serves branding assets from persisted settings with static fallbacks for app chrome and SEO surfaces.
// Domain: Dynamic Asset Delivery
// Env / Identity: Next.js Route Handler
// Owner: Verixa Web
// Notes: Asset delivery must degrade to static defaults if persisted branding is missing or malformed.
// Critical Path: Branding asset delivery for header/footer/favicon/SEO surfaces.
// Primary Dependencies: Platform settings, fallback static assets, binary response handling.
// Risk Notes: If DB access fails, redirect to a safe static asset rather than 500.
// ============================================================================
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDatabaseUnavailable, markDatabaseUnavailable } from "@/lib/db-availability";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type"); // "header", "footer", "favicon", "seo"
  
  let key = "";
  let defaultUrl = "";
  
  if (type === "header") {
    key = "headerLogo";
    defaultUrl = "/brand/Vertixa2.png";
  } else if (type === "footer") {
    key = "footerLogo";
    defaultUrl = "/brand/Vertixa3.png";
  } else if (type === "favicon") {
    key = "favicon";
    defaultUrl = "/favicon.ico";
  } else if (type === "seo") {
    key = "seoImage";
    // We don't have a default SEO image right now, but we can fallback to Verixa2
    defaultUrl = "/brand/Vertixa2.png";
  } else {
    // default to header
    key = "headerLogo";
    defaultUrl = "/brand/Vertixa2.png";
  }

  if (isDatabaseUnavailable()) {
    return NextResponse.redirect(new URL(defaultUrl, request.url));
  }

  try {
    const setting = await prisma.platformSetting.findUnique({ where: { key } });
    
    if (!setting || !setting.value || !setting.value.startsWith("data:image/")) {
      return NextResponse.redirect(new URL(defaultUrl, request.url));
    }
    
    const matches = setting.value.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return NextResponse.redirect(new URL(defaultUrl, request.url));
    }
    
    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");
    
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=60, s-maxage=3600, stale-while-revalidate=86400",
      }
    });
  } catch (e) {
    markDatabaseUnavailable(e);
    console.error("Error serving dynamic asset:", e);
    return NextResponse.redirect(new URL(defaultUrl, request.url));
  }
}
