// ============================================================================
// Hardware Source: src/app/api/facebook/auth/callback/route.ts
// Route: /api/facebook/auth/callback
// Version: 1.0.0 — 2026-04-08
// Why: OAuth callback that completes Facebook authorization and persists integration state.
// Domain: OAuth Integrations
// Env / Identity: Next.js Route Handler
// Owner: Verixa Web
// Notes: OAuth flows must validate state, handle missing credentials safely, and avoid persisting invalid tokens.
// Critical Path: Admin social publishing credential bootstrap.
// Primary Dependencies: OAuth client config, session authorization, logSystemEvent, settings persistence.
// Risk Notes: Do not persist partial authorizations or stale tokens.
// ============================================================================
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { logSystemEvent } from "@/lib/logger";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorReason = url.searchParams.get("error_reason");

  const PROD_URL = process.env.NODE_ENV === "production" ? "https://www.getverixa.com" : "http://localhost:3000";
  const baseUrl = `${PROD_URL}/dashboard/admin/social`;

  if (error) {
    await logSystemEvent("FACEBOOK_AUTH_CALLBACK_FAILED", { error, errorReason }, "ADMIN", (session.user as any).id);
    return NextResponse.redirect(`${baseUrl}?facebook_error=${encodeURIComponent(errorReason || error)}`);
  }

  if (!code) {
    await logSystemEvent("FACEBOOK_AUTH_CALLBACK_FAILED", { msg: "No code provided" }, "ADMIN", (session.user as any).id);
    return NextResponse.redirect(`${baseUrl}?facebook_error=No+code+provided`);
  }

  try {
    const clientId = process.env.FACEBOOK_CLIENT_ID!;
    const clientSecret = process.env.FACEBOOK_CLIENT_SECRET!;
    const redirectUri = `${PROD_URL}/api/facebook/auth/callback`;

    // 1. Exchange OAuth code for a short-lived User Access Token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${clientSecret}&code=${code}`
    );
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error("[Facebook] Error exchanging code:", tokenData);
      await logSystemEvent("FACEBOOK_AUTH_TOKEN_EXCHANGE_FAILED", tokenData, "ADMIN", (session.user as any).id);
      return NextResponse.redirect(`${baseUrl}?facebook_error=TokenExchnageFailed`);
    }

    const shortLivedToken = tokenData.access_token;

    // 2. Exchange short-lived token for a long-lived User Access Token
    const longTokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${shortLivedToken}`
    );
    const longTokenData = await longTokenRes.json();
    const longLivedUserToken = longTokenData.access_token || shortLivedToken;

    // 3. Get the User's Pages (to extract Page-Specific long-lived token)
    const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${longLivedUserToken}`);
    const pagesData = await pagesRes.json();

    if (!pagesData.data || pagesData.data.length === 0) {
      console.error("[Facebook] No pages found for user.", pagesData);
      await logSystemEvent("FACEBOOK_AUTH_NO_PAGES_FOUND", pagesData, "ADMIN", (session.user as any).id);
      return NextResponse.redirect(`${baseUrl}?facebook_error=NoPagesUnderAccount`);
    }

    // Auto-select the first page
    const primaryPage = pagesData.data[0];
    const pageAccessToken = primaryPage.access_token;
    const pageId = primaryPage.id;
    const pageName = primaryPage.name;

    // 4. Save Page info to DB
    await prisma.platformSetting.upsert({
      where: { key: "facebook_page_token" },
      update: { value: pageAccessToken },
      create: { key: "facebook_page_token", value: pageAccessToken },
    });

    await prisma.platformSetting.upsert({
      where: { key: "facebook_page_id" },
      update: { value: pageId },
      create: { key: "facebook_page_id", value: pageId },
    });

    await prisma.platformSetting.upsert({
      where: { key: "facebook_page_name" },
      update: { value: pageName },
      create: { key: "facebook_page_name", value: pageName },
    });

    await logSystemEvent("FACEBOOK_AUTH_SUCCESS", { pageId, pageName }, "ADMIN", (session.user as any).id);

    return NextResponse.redirect(`${baseUrl}?facebook_connected=true`);
  } catch (err: any) {
    console.error("[Facebook] Callback Exception:", err);
    await logSystemEvent("FACEBOOK_AUTH_EXCEPTION", err, "ADMIN", (session.user as any).id);
    return NextResponse.redirect(`${baseUrl}?facebook_error=ExceptionOccurred`);
  }
}
