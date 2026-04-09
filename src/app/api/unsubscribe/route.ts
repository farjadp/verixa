// ============================================================================
// Hardware Source: src/app/api/unsubscribe/route.ts
// Route: /api/unsubscribe
// Version: 1.0.0 — 2026-04-08
// Why: Compliance endpoint for verified unsubscribe requests and preference updates.
// Domain: Compliance & Preferences
// Env / Identity: Next.js Route Handler
// Owner: Verixa Web
// Notes: Privacy-sensitive flow; validate token/email pairs before making any preference changes.
// Critical Path: User privacy opt-out route used to honor unsubscribe requests.
// Primary Dependencies: Token verification helper, platform unsubscribe store, redirect response handling.
// Risk Notes: Avoid side effects unless the request is verified.
// ============================================================================
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

