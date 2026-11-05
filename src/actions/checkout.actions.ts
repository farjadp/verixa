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

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new Error("Plan not found");
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
