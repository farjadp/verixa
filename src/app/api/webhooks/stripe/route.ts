import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { revalidatePath } from "next/cache";

// Stripe sends signed webhook events to this endpoint.
// Setup:
// 1. Stripe Dashboard → Developers → Webhooks → Add endpoint
//    URL: https://getverixa.ca/api/webhooks/stripe
//    Events to subscribe: payment_intent.payment_failed, payment_intent.canceled,
//    charge.refunded, payment_intent.amount_capturable_updated
// 2. Copy the Signing Secret and set STRIPE_WEBHOOK_SECRET in your env vars.
//
// Local testing:
//   stripe listen --forward-to localhost:3000/api/webhooks/stripe


export async function POST(req: NextRequest) {
  // 1. ── Signature Verification ────────────────────────────────────────────
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET is not configured.");
    return NextResponse.json({ ok: false, reason: "webhook not configured" }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err: any) {
    console.warn("[Stripe Webhook] Invalid signature:", err.message);
    return NextResponse.json({ ok: false, reason: "invalid signature" }, { status: 401 });
  }

  // 2. ── Event Routing ─────────────────────────────────────────────────────
  try {
    const { type, data } = event;
    const obj = data.object;

    console.log(`[Stripe Webhook] Received: ${type}`, { id: obj.id });

    switch (type) {

      // ── Payment failed (card declined, insufficient funds, etc.) ─────────
      case "payment_intent.payment_failed": {
        const piId = obj.id;
        const booking = await prisma.booking.findFirst({
          where: { stripePaymentIntentId: piId },
        });
        if (!booking) break;

        await prisma.booking.update({
          where: { id: booking.id },
          data: { paymentStatus: "FAILED", status: "CANCELLED" },
        });

        await prisma.bookingEventLog.create({
          data: {
            bookingId: booking.id,
            action: "PAYMENT_FAILED",
            actorType: "SYSTEM",
            notes: `Stripe payment failed. Reason: ${obj.last_payment_error?.message ?? "unknown"}`,
          },
        });

        console.log(`[Stripe Webhook] Booking ${booking.id} marked FAILED.`);
        revalidatePath("/dashboard/bookings");
        break;
      }

      // ── PaymentIntent canceled on Stripe side ────────────────────────────
      case "payment_intent.canceled": {
        const piId = obj.id;
        const booking = await prisma.booking.findFirst({
          where: { stripePaymentIntentId: piId },
        });
        if (!booking) break;

        // Only update if we haven't already processed it
        if (!["CAPTURED", "CANCELED"].includes(booking.paymentStatus ?? "")) {
          await prisma.booking.update({
            where: { id: booking.id },
            data: { paymentStatus: "CANCELED" },
          });

          await prisma.bookingEventLog.create({
            data: {
              bookingId: booking.id,
              action: "PAYMENT_CANCELED",
              actorType: "SYSTEM",
              notes: "PaymentIntent canceled by Stripe (e.g. expired hold).",
            },
          });

          console.log(`[Stripe Webhook] Booking ${booking.id} payment marked CANCELED.`);
          revalidatePath("/dashboard/bookings");
        }
        break;
      }

      // ── Charge refunded (full or partial) ───────────────────────────────
      case "charge.refunded": {
        const piId = obj.payment_intent;
        if (!piId) break;

        const booking = await prisma.booking.findFirst({
          where: { stripePaymentIntentId: piId },
        });
        if (!booking) break;

        await prisma.booking.update({
          where: { id: booking.id },
          data: { paymentStatus: "REFUNDED" },
        });

        await prisma.bookingEventLog.create({
          data: {
            bookingId: booking.id,
            action: "PAYMENT_REFUNDED",
            actorType: "SYSTEM",
            notes: `Charge refunded. Amount refunded: ${obj.amount_refunded} ${obj.currency?.toUpperCase()}.`,
          },
        });

        console.log(`[Stripe Webhook] Booking ${booking.id} marked REFUNDED.`);
        revalidatePath("/dashboard/bookings");
        break;
      }

      // ── Amount capturable updated (hold expired / amount changed) ────────
      case "payment_intent.amount_capturable_updated": {
        console.log(`[Stripe Webhook] amount_capturable_updated for PI: ${obj.id}`, {
          amount_capturable: obj.amount_capturable,
        });
        // Log-only — no DB mutation needed unless amount_capturable drops to 0 (expired).
        if (obj.amount_capturable === 0) {
          const booking = await prisma.booking.findFirst({
            where: { stripePaymentIntentId: obj.id },
          });
          if (booking && booking.paymentStatus === "REQUIRES_CAPTURE") {
            await prisma.booking.update({
              where: { id: booking.id },
              data: { paymentStatus: "FAILED" },
            });
            await prisma.bookingEventLog.create({
              data: {
                bookingId: booking.id,
                action: "PAYMENT_HOLD_EXPIRED",
                actorType: "SYSTEM",
                notes: "Stripe authorization hold expired (amount_capturable dropped to 0).",
              },
            });
          }
        }
        break;
      }

      // ── Subscription events ────────────────────────────────────────────
      case "checkout.session.completed": {
        if (obj.mode === "subscription") {
          // In checkout.actions.ts, we set metadata at the session level
          const metadata = obj.metadata || {};
          const { userId, planId } = metadata;

          if (userId && planId) {
            await prisma.subscription.upsert({
              where: { userId },
              update: {
                planId,
                status: "active",
                stripeCustomerId: typeof obj.customer === "string" ? obj.customer : undefined,
                stripeSubscriptionId: typeof obj.subscription === "string" ? obj.subscription : undefined,
              },
              create: {
                userId,
                planId,
                status: "active",
                stripeCustomerId: typeof obj.customer === "string" ? obj.customer : undefined,
                stripeSubscriptionId: typeof obj.subscription === "string" ? obj.subscription : undefined,
              }
            });
            console.log(`[Stripe Webhook] Subscription created/updated for User ${userId}. Plan: ${planId}`);
            revalidatePath("/dashboard");
            revalidatePath("/dashboard/billing");
          } else {
            console.warn(`[Stripe Webhook] checkout.session.completed missing userId/planId in metadata`);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subId = obj.id;
        try {
          // If we have the subscription mapped by stripeSubscriptionId
          const existingSub = await prisma.subscription.findUnique({
             where: { stripeSubscriptionId: subId }
          });

          if (existingSub) {
             const freePlan = await prisma.plan.findUnique({ where: { slug: "free" } });
             if (freePlan) {
               await prisma.subscription.update({
                 where: { id: existingSub.id },
                 data: { 
                    status: "cancelled",
                    planId: freePlan.id,
                    stripeSubscriptionId: null // clear it out since it's deleted
                 }
               });
               console.log(`[Stripe Webhook] Subscription ${subId} deleted in Stripe. User ${existingSub.userId} downgraded to Free.`);
               revalidatePath("/dashboard");
               revalidatePath("/dashboard/billing");
             }
          } else {
             console.log(`[Stripe Webhook] Received subscription.deleted for ${subId} but no matching stripeSubscriptionId found in DB.`);
          }
        } catch(e: any) {
          console.error(`[Stripe Webhook] Errored processing customer.subscription.deleted:`, e.message);
        }
        break;
      }
      
      case "customer.subscription.updated": {
        const subId = obj.id;
        const status = obj.status; // 'active', 'past_due', 'canceled', etc.
        const priceCents = obj.items?.data?.[0]?.price?.unit_amount;
        
        try {
           const existingSub = await prisma.subscription.findUnique({
              where: { stripeSubscriptionId: subId }
           });
           
           if (existingSub) {
             // In a fully dynamic system, you might look up plan ID from mapped Stripe Price IDs.
             // Since we rely on our DB for source of truth on plan tiers based on metadata initially,
             // we simply update the status here. If they change plans in portal, maybe write a script 
             // mapping prices -> verixa plans. For now, we update the status.
             await prisma.subscription.update({
                where: { id: existingSub.id },
                data: { status: status === 'active' ? 'active' : 'past_due' } // simplest safe mapping
             });
             console.log(`[Stripe Webhook] Updated subscription status ${subId} to ${status}`);
           }
        } catch (e: any) {
             console.error(`[Stripe Webhook] Errored processing customer.subscription.updated:`, e.message);
        }
        break;
      }

      default:
        // Unhandled event — acknowledge to prevent Stripe retrying
        console.log(`[Stripe Webhook] Unhandled event type: ${type}`);
    }

    return NextResponse.json({ ok: true, type });
  } catch (err: any) {
    console.error("[Stripe Webhook Error]", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
