// ============================================================================
// Route: /api/linkedin/auth
// Why: OAuth initiation route for connecting LinkedIn publishing credentials.
// Security: admin-only; issues a random `state` bound to an httpOnly cookie
//           that the callback verifies (CSRF / token-substitution protection).
// ============================================================================
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { logSystemEvent } from "@/lib/logger";
import { issueOAuthState, oauthRedirectBase } from "@/lib/oauth-state";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const clientId = process.env.LINKEDIN_CLIENT_ID;
    if (!clientId) {
      const err = "LINKEDIN_CLIENT_ID is not configured in environment variables.";
      await logSystemEvent("LINKEDIN_AUTH_INIT_ERROR", { error: err });
      return new NextResponse(err, { status: 500 });
    }

    const redirectUri = `${oauthRedirectBase()}/api/linkedin/auth/callback`;
    const scope = "openid profile email w_member_social";
    const state = await issueOAuthState("linkedin");

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      state,
    });
    const linkedinUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;

    await logSystemEvent("LINKEDIN_AUTH_INIT", { redirectUri, scope, clientIdPrefix: clientId.substring(0, 4) });

    return NextResponse.redirect(linkedinUrl);
  } catch (error: any) {
    console.error("[LinkedIn Init Error]:", error);
    await logSystemEvent("LINKEDIN_AUTH_INIT_ERROR", { error: error.message || error });
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
