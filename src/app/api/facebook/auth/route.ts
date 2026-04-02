import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { logSystemEvent } from "@/lib/logger";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    await logSystemEvent("FACEBOOK_AUTH_INIT_FAILED", { reason: "Unauthorized user" }, "SYSTEM", session?.user?.id);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = process.env.FACEBOOK_CLIENT_ID;
  if (!clientId) {
    await logSystemEvent("FACEBOOK_AUTH_INIT_FAILED", { reason: "Missing FACEBOOK_CLIENT_ID" }, "ADMIN", (session.user as any).id);
    return NextResponse.redirect(new URL("/dashboard/admin/social?facebook_error=Missing+Facebook+Credentials", req.url));
  }

  // MUST match the exact callback URI configured in Facebook Login settings
  const PROD_URL = process.env.NODE_ENV === "production" ? "https://www.getverixa.com" : "http://localhost:3000";
  const redirectUri = `${PROD_URL}/api/facebook/auth/callback`;

  // Request scopes needed for page posting and fetching page data
  const scopes = "pages_show_list,pages_manage_posts,pages_read_engagement";
  const state = Math.random().toString(36).substring(7);

  const fbAuthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scopes}`;

  await logSystemEvent("FACEBOOK_AUTH_INIT", { redirectUri, scopes }, "ADMIN", (session.user as any).id);

  return NextResponse.redirect(fbAuthUrl);
}
