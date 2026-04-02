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
