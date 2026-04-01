import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  const token = searchParams.get("token");

  if (!email || !token) {
    return NextResponse.redirect(new URL("/unsubscribe?status=invalid", req.url));
  }

  if (!verifyUnsubscribeToken(email, token)) {
    return NextResponse.redirect(new URL("/unsubscribe?status=invalid", req.url));
  }

  try {
    await (prisma as any).emailUnsubscribe.upsert({
      where: { email: email.toLowerCase() },
      create: { email: email.toLowerCase(), reason: "user_request" },
      update: { reason: "user_request" },
    });
    return NextResponse.redirect(new URL("/unsubscribe?status=success", req.url));
  } catch {
    return NextResponse.redirect(new URL("/unsubscribe?status=error", req.url));
  }
}

