// ============================================================================
// Hardware Source: src/app/api/linkedin/auth/callback/route.ts
// Route: /api/linkedin/auth/callback
// Version: 1.0.0 — 2026-04-08
// Why: OAuth callback that completes LinkedIn authorization and stores the resulting token.
// Domain: OAuth Integrations
// Env / Identity: Next.js Route Handler
// Owner: Verixa Web
// Notes: OAuth flows must validate state, handle missing credentials safely, and avoid persisting invalid tokens.
// Critical Path: Admin social publishing credential bootstrap.
// Primary Dependencies: OAuth client config, session authorization, logSystemEvent, settings persistence.
// Risk Notes: Do not persist partial authorizations or stale tokens.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { exchangeLinkedInCode } from "@/actions/publish.actions";
import { logSystemEvent } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    const errorDescription = req.nextUrl.searchParams.get("error_description");
    await logSystemEvent("LINKEDIN_AUTH_CALLBACK_FAILED", { error, errorDescription });
    return NextResponse.redirect(
      new URL(`/dashboard/admin/social?linkedin_error=${encodeURIComponent(error)}`, req.url)
    );
  }

  if (!code) {
    await logSystemEvent("LINKEDIN_AUTH_CALLBACK_FAILED", { error: "no_code" });
    return NextResponse.redirect(new URL("/dashboard/admin/social?linkedin_error=no_code", req.url));
  }

  const result = await exchangeLinkedInCode(code);

  if (!result.ok) {
    return NextResponse.redirect(
      new URL(`/dashboard/admin/social?linkedin_error=${encodeURIComponent(result.error || "unknown")}`, req.url)
    );
  }

  return NextResponse.redirect(new URL("/dashboard/admin/social?linkedin_connected=1", req.url));
}
