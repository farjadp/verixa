import { NextRequest, NextResponse } from "next/server";
import { exchangeLinkedInCode } from "@/actions/publish.actions";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/dashboard/admin/social?linkedin_error=${encodeURIComponent(error)}`, req.url)
    );
  }

  if (!code) {
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
