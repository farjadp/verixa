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
import { stripe } from "@/lib/stripe";
import { createPlanCheckoutSession } from "@/lib/stripe-checkout";

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
): Promise<{ ok: boolean; error?: string; subscription?: any; url?: string }> {
  const session = await requireAuth();
  const userId = (session.user as any)?.id as string;
  const userEmail = session.user?.email;

  // Re-validate server-side (never trust the client preview)
  const validation = await validateCoupon(code, planId);
  if (!validation.ok || !validation.coupon) {
    return { ok: false, error: validation.error };
  }
  const couponId: string = validation.coupon.id;
  const finalPriceCents = validation.finalPriceCents ?? 0;
  const discountCents = validation.discountCents ?? 0;

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) return { ok: false, error: "Plan not found." };

  // ── Paid remainder: the coupon is mirrored to Stripe and the user pays the
  //    discounted price through Checkout. The subscription is activated (and the
  //    coupon usage recorded) by the checkout.session.completed webhook.
  if (finalPriceCents > 0) {
    if (!userEmail) return { ok: false, error: "Your account has no email address." };

    // Reserve one use NOW, atomically, so N users cannot all start checkout on a
    // maxUses:1 code. The webhook releases it on checkout.session.expired and
    // records the usage on checkout.session.completed (without a second increment).
    const claimed = await prisma.discountCode.updateMany({
      where: {
        id: couponId,
        isActive: true,
        OR: [{ maxUses: null }, { usedCount: { lt: prisma.discountCode.fields.maxUses } }],
      },
      data: { usedCount: { increment: 1 } },
    });
    if (claimed.count === 0) {
      return { ok: false, error: "This coupon has just reached its usage limit." };
    }

    let stripeCouponId: string | null = null;
    try {
      const c = validation.coupon;
      const stripeCoupon = await stripe.coupons.create({
        name: `Verixa ${c.code}`,
        ...(c.type === "PERCENT"
          ? { percent_off: c.value }
          : { amount_off: Math.min(c.value, plan.priceCents), currency: "cad" }),
        ...(c.durationMonths
          ? { duration: "repeating" as const, duration_in_months: c.durationMonths }
          : { duration: "once" as const }),
        max_redemptions: 1,
        metadata: { verixaCouponId: couponId, userId },
      });
      stripeCouponId = stripeCoupon.id;

      const checkout = await createPlanCheckoutSession({
        user: { id: userId, email: userEmail },
        plan,
        isAnnual: false,
        stripeCouponId: stripeCoupon.id,
        extraMetadata: {
          couponId,
          couponCode: c.code,
          discountCents: String(discountCents),
          stripeCouponId: stripeCoupon.id,
        },
      });

      if (!checkout.url) throw new Error("Could not start checkout.");
      return { ok: true, url: checkout.url };
    } catch (err) {
      console.error("Coupon checkout error:", err);
      // Release the reservation and the orphaned Stripe coupon.
      await prisma.discountCode.updateMany({
        where: { id: couponId, usedCount: { gt: 0 } },
        data: { usedCount: { decrement: 1 } },
      }).catch(() => {});
      if (stripeCouponId) await stripe.coupons.del(stripeCouponId).catch(() => {});
      return { ok: false, error: err instanceof Error ? err.message : "Failed to start checkout." };
    }
  }

  // ── 100% discount: activate directly, atomically.
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Atomic guard: claim one use only if still under the limit. Two concurrent
      // callers cannot both pass because the increment and the check are one UPDATE.
      const claimed = await tx.discountCode.updateMany({
        where: {
          id: couponId,
          isActive: true,
          OR: [{ maxUses: null }, { usedCount: { lt: tx.discountCode.fields.maxUses } }],
        },
        data: { usedCount: { increment: 1 } },
      });
      if (claimed.count === 0) {
        throw new Error("This coupon has just reached its usage limit.");
      }

      const sub = await tx.subscription.upsert({
        where: { userId },
        update: {
          planId,
          status: "active",
          startDate: new Date(),
          endDate: null,
          notes: notes ?? `Coupon: ${validation.coupon!.code}`,
        },
        create: {
          userId,
          planId,
          status: "active",
          startDate: new Date(),
          notes: `Coupon: ${validation.coupon!.code}`,
        },
      });

      // Unique (codeId, userId) makes a second use of the same code fail here
      // and roll back the increment above.
      await tx.discountCodeUsage.create({
        data: {
          codeId: couponId,
          userId,
          subscriptionId: sub.id,
          discountCents,
        },
      });

      return sub;
    });

    await prisma.systemLog.create({
      data: {
        userId,
        role: "CONSULTANT",
        action: "COUPON_APPLIED",
        details: JSON.stringify({ code: validation.coupon!.code, planId, discountCents }),
      },
    });

    revalidatePath("/dashboard/billing");
    return { ok: true, subscription: result };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to apply coupon." };
  }
}
