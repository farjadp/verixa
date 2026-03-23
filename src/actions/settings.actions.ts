"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { revalidatePath } from "next/cache";

export async function updatePlatformSettings(settings: { key: string; value: string }[]) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized");

  // Upsert all settings sequentially
  for (const s of settings) {
    if (!s.key) continue;
    await prisma.platformSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value }
    });
  }

  // Brutally revalidate the blog paths so the frontend updates immediately
  revalidatePath("/blog");
  revalidatePath("/blog/[slug]", "page");

  return { success: true };
}
