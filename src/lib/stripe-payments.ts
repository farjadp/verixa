// Server-only Stripe payment helpers. NOT a "use server" module on purpose:
// nothing here may be reachable as a public server action. Only server code
// (booking actions, webhooks) imports these.
import { stripe } from "@/lib/stripe";

function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

/** Confirms a PaymentIntent is a real, authorised hold for exactly this consultation. */
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
    if (pi.currency !== "cad") return { ok: false, error: "unexpected currency" };
    if (pi.capture_method !== "manual") return { ok: false, error: "payment was not created as a hold" };
    if ((pi.metadata?.licenseNumber || "").toUpperCase() !== expected.licenseNumber.toUpperCase()) {
      return { ok: false, error: "payment hold belongs to a different consultant" };
    }
    if (pi.metadata?.consultationTypeId !== expected.consultationTypeId) {
      return { ok: false, error: "payment hold belongs to a different consultation type" };
    }
    return { ok: true };
  } catch (e) {
    console.error("Stripe verify error:", e);
    return { ok: false, error: errorMessage(e) };
  }
}

export async function capturePayment(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);
    return { success: true as const, status: paymentIntent.status };
  } catch (e) {
    console.error("Stripe capture error:", e);
    return { success: false as const, error: errorMessage(e) };
  }
}

export async function cancelPayment(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
    return { success: true as const, status: paymentIntent.status };
  } catch (e) {
    console.error("Stripe cancel error:", e);
    return { success: false as const, error: errorMessage(e) };
  }
}

/** Refund a captured payment (full when amountCents is omitted). */
export async function refundPayment(paymentIntentId: string, amountCents?: number) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const chargeId = paymentIntent.latest_charge as string | undefined;
    if (!chargeId) {
      return { success: false as const, error: "No charge found on PaymentIntent — cannot refund." };
    }
    const refund = await stripe.refunds.create({
      charge: chargeId,
      ...(amountCents ? { amount: amountCents } : {}),
    });
    return { success: true as const, refundId: refund.id, status: refund.status };
  } catch (e) {
    console.error("Stripe refund error:", e);
    return { success: false as const, error: errorMessage(e) };
  }
}
