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
