"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { createPlanCheckoutSession } from "@/lib/stripe-checkout";

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

    // Plans are for consultants; clients (USER) can't subscribe to one.
    if (user.role !== "CONSULTANT") {
      return { success: false, error: "Plans are available to consultants who have claimed their profile." };
    }

    const plan = await prisma.plan.findUnique({
      where: { id: String(planId ?? "") },
    });

    // Soft-deleted plans must not be purchasable, and the free plan has nothing to charge.
    if (!plan || !plan.isActive) {
      return { success: false, error: "This plan is no longer available." };
    }
    if (plan.priceCents <= 0) {
      return { success: false, error: "The free plan doesn't need checkout." };
    }

    const checkoutSession = await createPlanCheckoutSession({
      user: { id: user.id, email: user.email! },
      plan,
      isAnnual,
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
