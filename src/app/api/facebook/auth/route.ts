// ============================================================================
// Route: /api/facebook/auth
// Why: OAuth initiation route for connecting Facebook publishing credentials.
// Security: admin-only; issues a random `state` bound to an httpOnly cookie
//           that the callback verifies.
// ============================================================================
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { logSystemEvent } from "@/lib/logger";
import { issueOAuthState, oauthRedirectBase } from "@/lib/oauth-state";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    await logSystemEvent("FACEBOOK_AUTH_INIT_FAILED", { reason: "Unauthorized user" }, "SYSTEM", session?.user?.id);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = process.env.FACEBOOK_CLIENT_ID;
  if (!clientId) {
    await logSystemEvent("FACEBOOK_AUTH_INIT_FAILED", { reason: "Missing FACEBOOK_CLIENT_ID" }, "ADMIN", session.user.id);
    return NextResponse.redirect(new URL("/dashboard/admin/social?facebook_error=Missing+Facebook+Credentials", req.url));
  }

  // MUST match the exact callback URI configured in Facebook Login settings
  const redirectUri = `${oauthRedirectBase()}/api/facebook/auth/callback`;
  const scopes = "pages_show_list,pages_manage_posts,pages_read_engagement";
  const state = await issueOAuthState("facebook");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: scopes,
  });
  const fbAuthUrl = `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;

  await logSystemEvent("FACEBOOK_AUTH_INIT", { redirectUri, scopes }, "ADMIN", session.user.id);

  return NextResponse.redirect(fbAuthUrl);
}
