"use server";

import { stripe } from "@/lib/stripe";

export async function createPaymentIntentAction(amountCents: number, metadata: Record<string, string>) {
  try {
    if (!amountCents || amountCents <= 0) {
      throw new Error("Invalid amount");
    }

    // Create a PaymentIntent with capture_method: 'manual' (Escrow hold)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "cad",
      capture_method: "manual",
      metadata, 
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
