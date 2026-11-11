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

async function unsubscribe(email: string | null, token: string | null): Promise<"invalid" | "success" | "error"> {
  if (!email || !token || !verifyUnsubscribeToken(email, token)) return "invalid";
  try {
    await (prisma as any).emailUnsubscribe.upsert({
      where: { email: email.toLowerCase() },
      create: { email: email.toLowerCase(), reason: "user_request" },
      update: { reason: "user_request" },
    });
    return "success";
  } catch {
    return "error";
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = await unsubscribe(searchParams.get("email"), searchParams.get("token"));
  return NextResponse.redirect(new URL(`/unsubscribe?status=${status}`, req.url));
}

// RFC 8058 one-click: body is "List-Unsubscribe=One-Click"; identity comes from the signed URL.
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = await unsubscribe(searchParams.get("email"), searchParams.get("token"));
  return NextResponse.json({ ok: status === "success" }, { status: status === "invalid" ? 400 : status === "error" ? 500 : 200 });
}
