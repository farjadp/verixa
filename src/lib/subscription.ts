/**
 * subscription.ts
 * Core SaaS subscription helpers.
 * These are the ONLY place feature access should be checked — never hardcode plan logic.
 *
 * Rule: "Plans are configuration, not code."
 */

import { prisma } from "@/lib/prisma";
import { cache } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FeatureAccess {
  enabled: boolean;
  value: string | null; // "3", "unlimited", "7" etc. — or null for boolean features
}

// ─── Internal: get the free plan (fallback for users without subscription) ──

async function getFreePlan() {
  return prisma.plan.findUnique({ where: { slug: "free" } });
}

// ─── Get user's active subscription + plan ──────────────────────────────────

export async function getUserSubscription(userId: string) {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    include: { plan: true },
  });

  if (sub?.status === "active") return sub;

  // Fallback: treat as Free plan (no DB subscription required for free users)
  const freePlan = await getFreePlan();
  if (!freePlan) return null;

  return { plan: freePlan, status: "active", planId: freePlan.id, userId };
}

// ─── Check feature access ────────────────────────────────────────────────────

export async function hasFeature(
  userId: string,
  featureKey: string
): Promise<FeatureAccess> {
  const sub = await getUserSubscription(userId);
  if (!sub) return { enabled: false, value: null };

  const pf = await prisma.planFeature.findFirst({
    where: {
      planId: sub.planId ?? sub.plan.id,
      feature: { key: featureKey },
    },
    include: { feature: true },
  });

  if (!pf) return { enabled: false, value: null };
  return { enabled: pf.enabled, value: pf.value ?? null };
}

// ─── Get commission for a consultant (by userId) ────────────────────────────

export async function getPlanCommission(userId: string): Promise<number> {
  const sub = await getUserSubscription(userId);
  return sub?.plan?.commission ?? 21; // default: Free tier 21%
}

// ─── Get plan details by ID ─────────────────────────────────────────────────

export async function getPlanById(planId: string) {
  return prisma.plan.findUnique({
    where: { id: planId },
    include: { planFeatures: { include: { feature: true } } },
  });
}

// ─── Get all plans with features (for admin / pricing page) ─────────────────

export const getAllPlansWithFeatures = cache(async () => {
  return prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      planFeatures: {
        include: { feature: { select: { key: true, name: true, category: true, type: true } } },
        orderBy: { feature: { sortOrder: "asc" } },
      },
      _count: { select: { subscriptions: { where: { status: "active" } } } },
    },
  });
});
