import { stripe } from "@/lib/stripe";

type PlanLike = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  yearlyPriceCents?: number | null;
};

type UserLike = { id: string; email: string };

/**
 * Builds a Stripe Checkout Session for a plan subscription.
 * Shared by the plain upgrade flow and the coupon flow so both go through the
 * same webhook (checkout.session.completed) to activate the subscription.
 */
export async function createPlanCheckoutSession(opts: {
  user: UserLike;
  plan: PlanLike;
  isAnnual: boolean;
  stripeCouponId?: string;
  extraMetadata?: Record<string, string>;
}) {
  const { user, plan, isAnnual, stripeCouponId, extraMetadata = {} } = opts;

  if (plan.priceCents === 0) {
    throw new Error("Cannot create checkout for a free plan.");
  }

  const amount = isAnnual ? (plan.yearlyPriceCents ?? plan.priceCents * 12) : plan.priceCents;
  const interval = isAnnual ? "year" : "month";
  const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

  const metadata = {
    userId: user.id,
    planId: plan.id,
    planSlug: plan.slug,
    ...extraMetadata,
  };

  return stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: user.email,
    line_items: [
      {
        price_data: {
          currency: "cad",
          product_data: {
            name: `Verixa ${plan.name} Plan`,
            description: `${interval === "year" ? "Annual" : "Monthly"} subscription for verified consultants.`,
          },
          unit_amount: amount,
          recurring: { interval },
        },
        quantity: 1,
      },
    ],
    ...(stripeCouponId ? { discounts: [{ coupon: stripeCouponId }] } : {}),
    metadata,
    subscription_data: { metadata },
    success_url: `${APP_URL}/dashboard/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/dashboard/billing/cancel`,
  });
}
