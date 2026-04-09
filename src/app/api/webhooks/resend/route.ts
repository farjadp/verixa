// ============================================================================
// Hardware Source: src/app/api/webhooks/resend/route.ts
// Route: /api/webhooks/resend
// Version: 1.0.0 — 2026-04-08
// Why: Webhook receiver for Resend delivery events with Svix signature verification.
// Domain: Webhooks & Integrations
// Env / Identity: Next.js Route Handler
// Owner: Verixa Web
// Notes: Webhook payloads are externally supplied; signature verification and idempotency checks are required.
// Critical Path: Email event ingestion for delivery analytics and bounce handling.
// Primary Dependencies: Svix verification, recipient logs, unsubscribe state, campaign records.
// Risk Notes: Reject unverified payloads and keep processing idempotent.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Webhook } from "svix";

// Resend uses Svix to sign all outgoing webhook payloads.
// The signature is NOT a simple HMAC of the body. It is computed
// across three pieces: svix-id + svix-timestamp + raw_body concatenated.
// The svix package handles this correctly — DO NOT try to replicate manually.
//
// Setup steps:
// 1. Resend Dashboard → Webhooks → Add endpoint → https://getverixa.ca/api/webhooks/resend
// 2. Select events: email.delivered, email.bounced, email.complained
// 3. Copy the Signing Secret and set RESEND_WEBHOOK_SECRET in your env vars.

export async function POST(req: NextRequest) {
  // 1. ── Signature Verification ────────────────────────────────────────────
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[Resend Webhook] RESEND_WEBHOOK_SECRET is not configured.");
    return NextResponse.json({ ok: false, reason: "webhook not configured" }, { status: 500 });
  }

  // We need the raw body as a string for svix to verify correctly.
  const rawBody = await req.text();

  const svixId        = req.headers.get("svix-id")        ?? "";
  const svixTimestamp = req.headers.get("svix-timestamp")  ?? "";
  const svixSignature = req.headers.get("svix-signature")  ?? "";

  const wh = new Webhook(secret);

  let eventPayload: any;
  try {
    // wh.verify throws an error if the signature is invalid or the timestamp
    // is outside the 5-minute tolerance window Svix enforces by default.
    eventPayload = wh.verify(rawBody, {
      "svix-id":        svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch (err: any) {
    console.warn("[Resend Webhook] Invalid signature:", err.message);
    return NextResponse.json({ ok: false, reason: "invalid signature" }, { status: 401 });
  }

  // 2. ── Event Handling ────────────────────────────────────────────────────
  try {
    const { type, data } = eventPayload;

    const resendId = data?.email_id;
    if (!resendId) {
      return NextResponse.json({ ok: false, reason: "no email_id" }, { status: 400 });
    }

    const statusMap: Record<string, string> = {
      "email.delivered":  "DELIVERED",
      "email.bounced":    "BOUNCED",
      "email.complained": "COMPLAINED",
    };

    const newStatus = statusMap[type];
    if (!newStatus) {
      // Unknown event type — acknowledge but do nothing
      return NextResponse.json({ ok: true, skipped: true });
    }

    const updated = await (prisma as any).campaignRecipient.updateMany({
      where: { resendId },
      data: { status: newStatus },
    });

    // Bounced or complained → auto-add to unsubscribe list
    if (newStatus === "BOUNCED" || newStatus === "COMPLAINED") {
      const recipient = await (prisma as any).campaignRecipient.findFirst({
        where: { resendId },
        select: { email: true },
      });
      if (recipient?.email) {
        await (prisma as any).emailUnsubscribe.upsert({
          where: { email: recipient.email.toLowerCase() },
          create: {
            email: recipient.email.toLowerCase(),
            reason: newStatus === "BOUNCED" ? "bounced" : "complained",
          },
          update: {
            reason: newStatus === "BOUNCED" ? "bounced" : "complained",
          },
        });
      }
    }

    return NextResponse.json({ ok: true, updated: updated.count });
  } catch (err: any) {
    console.error("[Resend Webhook Error]", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
