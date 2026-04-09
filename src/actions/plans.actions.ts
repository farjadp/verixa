"use server";
// ============================================================================
// plans.actions.ts
// Version: 1.0.0 — 2026-03-25
// Why: Config-driven SaaS plan management. Admin CRUD for plans, features,
//      plan-feature matrix, and user subscriptions.
// Rule: Commission and feature access must never be hardcoded elsewhere.
// ============================================================================

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { revalidatePath } from "next/cache";

// ─── Auth Guard ──────────────────────────────────────────────────────────────

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || role !== "ADMIN") throw new Error("Unauthorized: Admin only");
  return session;
}

// ─── PLAN CRUD ───────────────────────────────────────────────────────────────

export async function getPlans() {
  return prisma.plan.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      planFeatures: {
        include: { feature: true },
        orderBy: { feature: { sortOrder: "asc" } },
      },
      _count: { select: { subscriptions: { where: { status: "active" } } } },
    },
  });
}

export async function createPlan(data: {
  name: string;
  slug: string;
  description?: string;
  priceCents: number;
  commission: number;
  isRecommended?: boolean;
  sortOrder?: number;
}) {
  await requireAdmin();
  const plan = await prisma.plan.create({ data });
  revalidatePath("/dashboard/admin/plans");
  return plan;
}

export async function updatePlan(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    priceCents: number;
    yearlyPriceCents: number | null;
    commission: number;
    isActive: boolean;
    isRecommended: boolean;
    sortOrder: number;
  }>
) {
  await requireAdmin();
  const plan = await prisma.plan.update({ where: { id }, data });
  revalidatePath("/dashboard/admin/plans");
  return plan;
}

export async function deletePlan(id: string) {
  await requireAdmin();
  // Soft delete — don't break existing subscriptions
  await prisma.plan.update({ where: { id }, data: { isActive: false } });
  revalidatePath("/dashboard/admin/plans");
}

// ─── FEATURE CRUD ────────────────────────────────────────────────────────────

export async function getFeatures() {
  return prisma.feature.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    include: { _count: { select: { planFeatures: true } } },
  });
}

export async function createFeature(data: {
  key: string;
  name: string;
  description?: string;
  category: string;
  type?: string;
  sortOrder?: number;
}) {
  await requireAdmin();
  const feature = await prisma.feature.create({ data });
  revalidatePath("/dashboard/admin/plans");
  return feature;
}

export async function updateFeature(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    category: string;
    type: string;
    sortOrder: number;
  }>
) {
  await requireAdmin();
  const feature = await prisma.feature.update({ where: { id }, data });
  revalidatePath("/dashboard/admin/plans");
  return feature;
}

export async function deleteFeature(id: string) {
  await requireAdmin();
  await prisma.feature.delete({ where: { id } });
  revalidatePath("/dashboard/admin/plans");
}

// ─── PLAN-FEATURE MATRIX (Plan Builder) ─────────────────────────────────────

export async function updatePlanFeature(
  planId: string,
  featureId: string,
  data: { enabled?: boolean; value?: string | null }
) {
  await requireAdmin();
  
  const pf = await prisma.planFeature.upsert({
    where: { planId_featureId: { planId, featureId } },
    update: data,
    create: { planId, featureId, enabled: data.enabled ?? true, value: data.value ?? null },
  });

  revalidatePath("/dashboard/admin/plans/builder");
  return pf;
}

// ─── SUBSCRIPTION MANAGEMENT ─────────────────────────────────────────────────

export async function getSubscriptions() {
  return prisma.subscription.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true, name: true, email: true, role: true, image: true,
          consultantProfile: { select: { id: true, fullName: true, licenseNumber: true } },
          _count: { select: { reviews: true } },
        },
      },
      plan: { select: { id: true, name: true, slug: true, commission: true, priceCents: true } },
    },
  });
}

export async function getUnsubscribedConsultants() {
  // Consultants with no active subscription (they're implicitly on free)
  const consultantsWithSub = await prisma.subscription.findMany({
    where: { status: "active", user: { role: "CONSULTANT" } },
    select: { userId: true },
  });
  const subscribedIds = consultantsWithSub.map((s) => s.userId);

  return prisma.user.findMany({
    where: {
      role: "CONSULTANT",
      id: { notIn: subscribedIds },
    },
    include: {
      consultantProfile: { select: { fullName: true, licenseNumber: true } },
    },
    take: 50,
  });
}

export async function assignPlan(
  userId: string,
  planId: string,
  notes?: string
) {
  const adminSession = await requireAdmin();
  const adminId = (adminSession.user as any)?.id;

  const sub = await prisma.subscription.upsert({
    where: { userId },
    update: {
      planId,
      status: "active",
      startDate: new Date(),
      endDate: null,
      notes: notes ?? null,
      assignedBy: adminId,
    },
    create: {
      userId,
      planId,
      status: "active",
      startDate: new Date(),
      notes: notes ?? null,
      assignedBy: adminId,
    },
  });

  revalidatePath("/dashboard/admin/plans/users");
  return sub;
}

export async function cancelSubscription(userId: string) {
  await requireAdmin();
  
  await prisma.subscription.update({
    where: { userId },
    data: { status: "cancelled", endDate: new Date() },
  });

  revalidatePath("/dashboard/admin/plans/users");
}

// ─── STATS ───────────────────────────────────────────────────────────────────

export async function getPlanStats() {
  const plans = await prisma.plan.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { subscriptions: { where: { status: "active" } } } },
    },
  });

  const totalRevenueCents = await prisma.booking.aggregate({
    where: { paymentStatus: "CAPTURED" },
    _sum: { grossAmountCents: true },
  });

  return {
    plans,
    totalRevenueCents: totalRevenueCents._sum.grossAmountCents ?? 0,
  };
}
