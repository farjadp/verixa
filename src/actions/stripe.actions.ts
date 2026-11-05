"use server";

import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

// The amount is looked up server-side from the consultant's active consultation
// type. The client only tells us WHICH service it wants, never the price.
export async function createPaymentIntentAction(input: {
  licenseNumber: string;
  consultationTypeId: string;
  clientEmail?: string;
}) {
  try {
    const licenseNumber = String(input?.licenseNumber || "").toUpperCase().trim();
    const consultationTypeId = String(input?.consultationTypeId || "").trim();
    if (!licenseNumber || !consultationTypeId) {
      throw new Error("Missing consultation details");
    }

    const type = await prisma.consultationType.findFirst({
      where: {
        id: consultationTypeId,
        isActive: true,
        profile: { licenseNumber },
      },
      select: { id: true, priceCents: true },
    });
    if (!type) throw new Error("Invalid consultation type");
    if (type.priceCents <= 0) throw new Error("This consultation does not require payment");

    // Create a PaymentIntent with capture_method: 'manual' (Escrow hold)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: type.priceCents,
      currency: "cad",
      capture_method: "manual",
      metadata: {
        licenseNumber,
        consultationTypeId: type.id,
        clientEmail: (input.clientEmail || "").slice(0, 200),
      },
    });

    return { 
      success: true, 
      clientSecret: paymentIntent.client_secret, 
      paymentIntentId: paymentIntent.id 
    };
  } catch (e: any) {
    console.error("Stripe create error:", e);
    return { success: false, error: e.message };
  }
}

// Confirms that a client-supplied PaymentIntent id is a real, authorised hold
// for exactly the consultation being booked. Used by createBookingRequest.
export async function verifyPaymentHold(
  paymentIntentId: string,
  expected: { expectedAmountCents: number; licenseNumber: string; consultationTypeId: string }
): Promise<{ ok: boolean; error?: string }> {
  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (pi.status !== "requires_capture") {
      return { ok: false, error: `payment hold is in state '${pi.status}', expected 'requires_capture'` };
    }
    if (pi.amount !== expected.expectedAmountCents) {
      return { ok: false, error: "authorised amount does not match the consultation price" };
    }
    if (pi.currency !== "cad") {
      return { ok: false, error: "unexpected currency" };
    }
    if (pi.capture_method !== "manual") {
      return { ok: false, error: "payment was not created as a hold" };
    }
    if ((pi.metadata?.licenseNumber || "").toUpperCase() !== expected.licenseNumber.toUpperCase()) {
      return { ok: false, error: "payment hold belongs to a different consultant" };
    }
    if (pi.metadata?.consultationTypeId !== expected.consultationTypeId) {
      return { ok: false, error: "payment hold belongs to a different consultation type" };
    }
    return { ok: true };
  } catch (e: any) {
    console.error("Stripe verify error:", e);
    return { ok: false, error: e.message };
  }
}

export async function capturePaymentAction(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);
    return { success: true, status: paymentIntent.status };
  } catch (e: any) {
    console.error("Stripe capture error:", e);
    return { success: false, error: e.message };
  }
}

export async function cancelPaymentAction(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
    return { success: true, status: paymentIntent.status };
  } catch (e: any) {
    console.error("Stripe cancel error:", e);
    return { success: false, error: e.message };
  }
}

// Issue 10 fix: Refund a captured payment when a booking is cancelled post-capture.
// Called when booking.paymentStatus === "CAPTURED" and the booking is being cancelled.
export async function refundPaymentAction(
  paymentIntentId: string,
  amountCents?: number // optional: partial refund; omit for full refund
) {
  try {
    // Retrieve the PI to find the charge ID
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const chargeId = paymentIntent.latest_charge as string | undefined;

    if (!chargeId) {
      return { success: false, error: "No charge found on PaymentIntent — cannot refund." };
    }

    const refund = await stripe.refunds.create({
      charge: chargeId,
      ...(amountCents ? { amount: amountCents } : {}), // omit for full refund
    });

    return { success: true, refundId: refund.id, status: refund.status };
  } catch (e: any) {
    console.error("Stripe refund error:", e);
    return { success: false, error: e.message };
  }
}
