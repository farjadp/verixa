"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function createUpgradeCheckoutSession(planId: string, isAnnual: boolean) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      throw new Error("Unauthorized");
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new Error("Plan not found");
    }

    if (plan.priceCents === 0) {
      throw new Error("Cannot create checkout for a free plan.");
    }

    const amount = isAnnual ? (plan.yearlyPriceCents ?? plan.priceCents * 12) : plan.priceCents;
    const interval = isAnnual ? "year" : "month";

    const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: user.email!,
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: `Verixa ${plan.name} Plan`,
              description: `${interval === "year" ? "Annual" : "Monthly"} subscription for verified consultants.`,
            },
            unit_amount: amount,
            recurring: {
              interval: interval,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id,
        planId: plan.id,
        planSlug: plan.slug,
      },
      // Subscription metadata specifically for webhooks to read easily
      subscription_data: {
        metadata: {
          userId: user.id,
          planId: plan.id,
          planSlug: plan.slug,
        }
      },
      success_url: `${APP_URL}/dashboard/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/dashboard/billing/cancel`,
    });

    return { success: true, url: checkoutSession.url };
  } catch (err: any) {
    console.error("Checkout Session Error:", err);
    return { success: false, error: err.message };
  }
}

export async function createCustomerPortalSession() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      throw new Error("Unauthorized");
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { subscription: true }
    });

    if (!user || !user.subscription?.stripeCustomerId) {
      throw new Error("No active Stripe customer found to manage.");
    }

    const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.subscription.stripeCustomerId,
      return_url: `${APP_URL}/dashboard/billing`,
    });

    return { success: true, url: portalSession.url };
  } catch (err: any) {
    console.error("Portal Session Error:", err);
    return { success: false, error: err.message };
  }
}
