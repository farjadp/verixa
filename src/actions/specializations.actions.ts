"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") throw new Error("Unauthorized");
}

// ─── READ ───────────────────────────────────────────────────────────────────
export async function getSpecializations() {
  return (prisma as any).specializationCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function getSpecializationPlanLimits() {
  // Load the feature
  const feature = await prisma.feature.findUnique({ where: { key: "max_specializations" } });
  if (!feature) return [];

  // Load all plans with their PlanFeature value for this feature
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      planFeatures: {
        where: { featureId: feature.id },
      },
    },
  });

  return plans.map((p: any) => ({
    planId: p.id,
    planName: p.name,
    planSlug: p.slug,
    featureId: feature.id,
    planFeatureId: p.planFeatures[0]?.id ?? null,
    limit: p.planFeatures[0]?.value ?? "3", // default 3
    enabled: p.planFeatures[0]?.enabled ?? true,
  }));
}

// ─── CATEGORIES ─────────────────────────────────────────────────────────────
export async function createCategory(name: string) {
  await requireAdmin();
  const last = await (prisma as any).specializationCategory.findFirst({ orderBy: { sortOrder: "desc" } });
  await (prisma as any).specializationCategory.create({
    data: { name: name.trim(), sortOrder: (last?.sortOrder ?? 0) + 1 },
  });
  revalidatePath("/dashboard/admin/specializations");
}

export async function updateCategory(id: string, name: string) {
  await requireAdmin();
  await (prisma as any).specializationCategory.update({ where: { id }, data: { name: name.trim() } });
  revalidatePath("/dashboard/admin/specializations");
}

export async function toggleCategory(id: string, isActive: boolean) {
  await requireAdmin();
  await (prisma as any).specializationCategory.update({ where: { id }, data: { isActive } });
  revalidatePath("/dashboard/admin/specializations");
}

export async function deleteCategory(id: string) {
  await requireAdmin();
  await (prisma as any).specializationCategory.delete({ where: { id } });
  revalidatePath("/dashboard/admin/specializations");
}

export async function reorderCategories(ids: string[]) {
  await requireAdmin();
  await Promise.all(ids.map((id, i) =>
    (prisma as any).specializationCategory.update({ where: { id }, data: { sortOrder: i } })
  ));
  revalidatePath("/dashboard/admin/specializations");
}

// ─── ITEMS ──────────────────────────────────────────────────────────────────
export async function createItem(categoryId: string, key: string, label: string) {
  await requireAdmin();
  const safKey = key.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const last = await (prisma as any).specializationItem.findFirst({
    where: { categoryId }, orderBy: { sortOrder: "desc" },
  });
  await (prisma as any).specializationItem.create({
    data: { key: safKey, label: label.trim(), categoryId, sortOrder: (last?.sortOrder ?? 0) + 1 },
  });
  revalidatePath("/dashboard/admin/specializations");
}

export async function updateItem(id: string, label: string) {
  await requireAdmin();
  await (prisma as any).specializationItem.update({ where: { id }, data: { label: label.trim() } });
  revalidatePath("/dashboard/admin/specializations");
}

export async function toggleItem(id: string, isActive: boolean) {
  await requireAdmin();
  await (prisma as any).specializationItem.update({ where: { id }, data: { isActive } });
  revalidatePath("/dashboard/admin/specializations");
}

export async function deleteItem(id: string) {
  await requireAdmin();
  await (prisma as any).specializationItem.delete({ where: { id } });
  revalidatePath("/dashboard/admin/specializations");
}

// ─── PLAN LIMITS ────────────────────────────────────────────────────────────
export async function saveSpecializationLimit(
  planId: string,
  featureId: string,
  planFeatureId: string | null,
  limit: string // "3", "10", "unlimited"
) {
  await requireAdmin();

  if (planFeatureId) {
    await prisma.planFeature.update({
      where: { id: planFeatureId },
      data: { value: limit, enabled: true },
    });
  } else {
    await (prisma as any).planFeature.create({
      data: { planId, featureId, value: limit, enabled: true },
    });
  }
  revalidatePath("/dashboard/admin/specializations");
}
