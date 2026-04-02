"use server";
// ============================================================================
// coupon.actions.ts
// Version: 1.0.0 — 2026-04-02
// Why: Full discount/coupon code management for Verixa SaaS platform.
//      Handles admin CRUD, user validation, and subscription application.
// Rules:
//   - One use per user per code (enforced by DB unique constraint)
//   - Server-side validation only (never trust the client)
//   - Admin-only creation/deletion
// ============================================================================

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { revalidatePath } from "next/cache";

// ─── Auth Guards ──────────────────────────────────────────────────────────────

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || role !== "ADMIN") throw new Error("Unauthorized: Admin only");
  return session;
}

async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized: Login required");
  return session;
}

// ─── ADMIN: CREATE COUPON ────────────────────────────────────────────────────

export async function createCoupon(data: {
  code: string;
  description?: string;
  type: "PERCENT" | "FIXED_CENTS";
  value: number;
  applicableTo?: string;
  allowedPlanIds?: string[]; // array of planId strings
  maxUses?: number | null;
  durationMonths?: number | null;
  startsAt?: Date | null;
  expiresAt?: Date | null;
}) {
  const session = await requireAdmin();
  const adminId = (session.user as any)?.id;

  // Validation
  if (!data.code || data.code.trim().length < 3) {
    return { ok: false, error: "Code must be at least 3 characters." };
  }
  if (data.type === "PERCENT" && (data.value <= 0 || data.value > 100)) {
    return { ok: false, error: "Percent discount must be between 1 and 100." };
  }
  if (data.type === "FIXED_CENTS" && data.value <= 0) {
    return { ok: false, error: "Fixed discount must be greater than 0." };
  }

  try {
    const coupon = await prisma.discountCode.create({
      data: {
        code: data.code.toUpperCase().trim(),
        description: data.description,
        type: data.type,
        value: data.value,
        applicableTo: data.applicableTo ?? "SUBSCRIPTION",
        allowedPlanIds: data.allowedPlanIds?.length
          ? JSON.stringify(data.allowedPlanIds)
          : null,
        maxUses: data.maxUses ?? null,
        durationMonths: data.durationMonths ?? null,
        startsAt: data.startsAt ?? null,
        expiresAt: data.expiresAt ?? null,
        createdBy: adminId,
      },
    });

    await prisma.systemLog.create({
      data: {
        userId: adminId,
        role: "ADMIN",
        action: "COUPON_CREATED",
        details: JSON.stringify({ code: coupon.code, type: coupon.type, value: coupon.value }),
      },
    });

    revalidatePath("/dashboard/admin/coupons");
    return { ok: true, coupon };
  } catch (err: any) {
    if (err.code === "P2002") {
      return { ok: false, error: `Code "${data.code.toUpperCase()}" already exists.` };
    }
    return { ok: false, error: err.message || "Failed to create coupon." };
  }
}

// ─── ADMIN: UPDATE COUPON ────────────────────────────────────────────────────

export async function updateCoupon(
  id: string,
  data: Partial<{
    description: string;
    maxUses: number | null;
    durationMonths: number | null;
    expiresAt: Date | null;
    startsAt: Date | null;
    isActive: boolean;
    allowedPlanIds: string[] | null;
  }>
) {
  await requireAdmin();

  const updatePayload: Record<string, any> = { ...data };
  if ("allowedPlanIds" in data) {
    updatePayload.allowedPlanIds = data.allowedPlanIds?.length
      ? JSON.stringify(data.allowedPlanIds)
      : null;
  }

  try {
    const coupon = await prisma.discountCode.update({
      where: { id },
      data: updatePayload,
    });
    revalidatePath("/dashboard/admin/coupons");
    return { ok: true, coupon };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to update coupon." };
  }
}

// ─── ADMIN: DELETE COUPON (soft) ─────────────────────────────────────────────

export async function deleteCoupon(id: string) {
  await requireAdmin();
  await prisma.discountCode.update({
    where: { id },
    data: { isActive: false },
  });
  revalidatePath("/dashboard/admin/coupons");
  return { ok: true };
}

// ─── ADMIN: GET ALL COUPONS ──────────────────────────────────────────────────

export async function getAllCoupons() {
  await requireAdmin();
  return prisma.discountCode.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { usages: true } },
    },
  });
}

// ─── ADMIN: GET USAGES FOR A COUPON ─────────────────────────────────────────

export async function getCouponUsages(codeId: string) {
  await requireAdmin();
  return prisma.discountCodeUsage.findMany({
    where: { codeId },
    orderBy: { createdAt: "desc" },
    include: {
      subscription: {
        include: { plan: { select: { name: true } } },
      },
    },
  });
}

// ─── USER: VALIDATE COUPON (preview only, no side effects) ──────────────────

export async function validateCoupon(code: string, planId: string): Promise<{
  ok: boolean;
  error?: string;
  coupon?: any;
  discountCents?: number;
  finalPriceCents?: number;
}> {
  const session = await requireAuth();
  const userId = (session.user as any)?.id;

  const coupon = await prisma.discountCode.findUnique({
    where: { code: code.toUpperCase().trim() },
  });

  if (!coupon || !coupon.isActive) {
    return { ok: false, error: "Invalid or inactive coupon code." };
  }

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    return { ok: false, error: "This coupon is not yet active." };
  }
  if (coupon.expiresAt && coupon.expiresAt < now) {
    return { ok: false, error: "This coupon has expired." };
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { ok: false, error: "This coupon has reached its usage limit." };
  }

  // Check if user already used this coupon
  const existingUsage = await prisma.discountCodeUsage.findUnique({
    where: { codeId_userId: { codeId: coupon.id, userId } },
  });
  if (existingUsage) {
    return { ok: false, error: "You have already used this coupon." };
  }

  // Check plan restriction
  if (coupon.allowedPlanIds) {
    const allowedIds: string[] = JSON.parse(coupon.allowedPlanIds);
    if (!allowedIds.includes(planId)) {
      return { ok: false, error: "This coupon is not valid for the selected plan." };
    }
  }

  // Get plan price for preview
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) return { ok: false, error: "Plan not found." };

  const basePriceCents = plan.priceCents;
  let discountCents = 0;

  if (coupon.type === "PERCENT") {
    discountCents = Math.floor((basePriceCents * coupon.value) / 100);
  } else {
    discountCents = Math.min(coupon.value, basePriceCents);
  }

  const finalPriceCents = Math.max(0, basePriceCents - discountCents);

  return {
    ok: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      durationMonths: coupon.durationMonths,
      description: coupon.description,
    },
    discountCents,
    finalPriceCents,
  };
}

// ─── USER: APPLY COUPON TO SUBSCRIPTION ─────────────────────────────────────

export async function applyCouponToSubscription(
  code: string,
  planId: string,
  notes?: string
): Promise<{ ok: boolean; error?: string; subscription?: any }> {
  const session = await requireAuth();
  const userId = (session.user as any)?.id;

  // Re-validate server-side (race condition safe)
  const validation = await validateCoupon(code, planId);
  if (!validation.ok || !validation.coupon) {
    return { ok: false, error: validation.error };
  }

  try {
    // Atomic: update usedCount + create subscription + log usage in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Final guard: increment usedCount only if still under limit
      const coupon = await tx.discountCode.findUnique({
        where: { id: validation.coupon!.id },
      });
      if (!coupon) throw new Error("Coupon not found.");
      if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
        throw new Error("This coupon has just reached its usage limit.");
      }

      // Create/update subscription
      const sub = await tx.subscription.upsert({
        where: { userId },
        update: {
          planId,
          status: "active",
          startDate: new Date(),
          endDate: null,
          notes: notes ?? `Coupon: ${coupon.code}`,
        },
        create: {
          userId,
          planId,
          status: "active",
          startDate: new Date(),
          notes: `Coupon: ${coupon.code}`,
        },
      });

      // Record usage
      await tx.discountCodeUsage.create({
        data: {
          codeId: coupon.id,
          userId,
          subscriptionId: sub.id,
          discountCents: validation.discountCents!,
        },
      });

      // Increment usedCount
      await tx.discountCode.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      });

      return sub;
    });

    await prisma.systemLog.create({
      data: {
        userId,
        role: "CONSULTANT",
        action: "COUPON_APPLIED",
        details: JSON.stringify({
          code: validation.coupon!.code,
          planId,
          discountCents: validation.discountCents,
        }),
      },
    });

    revalidatePath("/dashboard/billing");
    return { ok: true, subscription: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to apply coupon." };
  }
}
