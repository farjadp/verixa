import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = process.env.FACEBOOK_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL("/dashboard/admin/social?facebook_error=Missing+Facebook+Credentials", req.url));
  }

  // MUST match the exact callback URI configured in Facebook Login settings
  const redirectUri = "https://getverixa.com/api/facebook/auth/callback";

  // Request scopes needed for page posting and fetching page data
  const scopes = "pages_show_list,pages_manage_posts,pages_read_engagement";
  const state = Math.random().toString(36).substring(7);

  const fbAuthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scopes}`;

  return NextResponse.redirect(fbAuthUrl);
}
