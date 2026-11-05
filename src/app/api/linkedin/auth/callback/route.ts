// ============================================================================
// Route: /api/linkedin/auth/callback
// Why: OAuth callback that completes LinkedIn authorization and stores the token.
// Security: admin session required; `state` must match the cookie issued by
//           /api/linkedin/auth. Without both, no token is ever exchanged.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { exchangeLinkedInCode } from "@/actions/publish.actions";
import { logSystemEvent } from "@/lib/logger";
import { consumeOAuthState } from "@/lib/oauth-state";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");
  const state = req.nextUrl.searchParams.get("state");

  const stateOk = await consumeOAuthState("linkedin", state);
  if (!stateOk) {
    await logSystemEvent("LINKEDIN_AUTH_CALLBACK_FAILED", { error: "invalid_state" }, "ADMIN", session.user.id);
    return NextResponse.redirect(new URL("/dashboard/admin/social?linkedin_error=invalid_state", req.url));
  }

  if (error) {
    const errorDescription = req.nextUrl.searchParams.get("error_description");
    await logSystemEvent("LINKEDIN_AUTH_CALLBACK_FAILED", { error, errorDescription }, "ADMIN", session.user.id);
    return NextResponse.redirect(
      new URL(`/dashboard/admin/social?linkedin_error=${encodeURIComponent(error)}`, req.url)
    );
  }

  if (!code) {
    await logSystemEvent("LINKEDIN_AUTH_CALLBACK_FAILED", { error: "no_code" }, "ADMIN", session.user.id);
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
