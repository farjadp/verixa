"use server";

import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

// The ONLY public payment action. Capture / cancel / refund / verify live in
// src/lib/stripe-payments.ts so they cannot be invoked by anonymous callers.

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
      where: { id: consultationTypeId, isActive: true, profile: { licenseNumber } },
      select: { id: true, priceCents: true },
    });
    if (!type) throw new Error("Invalid consultation type");
    if (type.priceCents <= 0) throw new Error("This consultation does not require payment");

    // Manual capture = escrow hold; captured only when the consultant confirms.
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
      paymentIntentId: paymentIntent.id,
    };
  } catch (e) {
    console.error("Stripe create error:", e);
    return { success: false, error: e instanceof Error ? e.message : "Payment setup failed" };
  }
}
