// ============================================================================
// Hardware Source: src/app/api/linkedin/auth/route.ts
// Route: /api/linkedin/auth
// Version: 1.0.0 — 2026-04-08
// Why: OAuth initiation route for connecting LinkedIn publishing credentials.
// Domain: OAuth Integrations
// Env / Identity: Next.js Route Handler
// Owner: Verixa Web
// Notes: OAuth flows must validate state, handle missing credentials safely, and avoid persisting invalid tokens.
// Critical Path: Admin social publishing credential bootstrap.
// Primary Dependencies: OAuth client config, session authorization, logSystemEvent, settings persistence.
// Risk Notes: Do not persist partial authorizations or stale tokens.
// ============================================================================
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { logSystemEvent } from "@/lib/logger";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const clientId = process.env.LINKEDIN_CLIENT_ID;
    if (!clientId) {
      const err = "LINKEDIN_CLIENT_ID is not configured in environment variables.";
      await logSystemEvent("LINKEDIN_AUTH_INIT_ERROR", { error: err });
      return new NextResponse(err, { status: 500 });
    }

    const PROD_URL = process.env.NODE_ENV === "production" ? "https://www.getverixa.com" : "http://localhost:3000";
    const redirectUri = `${PROD_URL}/api/linkedin/auth/callback`;
    
    // Using legacy scopes since r_liteprofile was reported to work previously
    const scope = "openid profile email w_member_social";

    const linkedinUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;

    await logSystemEvent("LINKEDIN_AUTH_INIT", { redirectUri, scope, clientIdPrefix: clientId.substring(0, 4) });
    
    return NextResponse.redirect(linkedinUrl);
  } catch (error: any) {
    console.error("[LinkedIn Init Error]:", error);
    await logSystemEvent("LINKEDIN_AUTH_INIT_ERROR", { error: error.message || error });
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
