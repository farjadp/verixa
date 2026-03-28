"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export async function updatePlatformSettings(settings: { key: string; value: string }[]) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") throw new Error("Unauthorized");

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

export async function updateBillingMode(mode: "monthly" | "yearly" | "both") {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") throw new Error("Unauthorized");

  await prisma.platformSetting.upsert({
    where: { key: "billingMode" },
    update: { value: mode },
    create: { key: "billingMode", value: mode },
  });

  revalidatePath("/dashboard/admin/plans/pricing");
  revalidatePath("/pricing");
  return { success: true };
}

export async function updateProfileSettings(data: { name: string; email: string }) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) throw new Error("Unauthorized");

  // Check if email is already taken by someone else
  if (data.email !== session!.user?.email) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new Error("Email is already in use by another account.");
  }

  await prisma.user.update({
    where: { id: (session!.user as any).id },
    data: {
      name: data.name,
      email: data.email,
    }
  });

  revalidatePath("/dashboard/client/settings");
  revalidatePath("/dashboard/admin/settings");
  revalidatePath("/dashboard/consultant/settings");
  
  return { success: true };
}

export async function changePassword(data: { current: string; newPass: string }) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { id: (session!.user as any).id } });
  if (!user || !user.hashedPassword) throw new Error("User not found or no password set.");

  // For security, do not allow password change if the user registered via OAuth and doesn't have a hashed password
  // (We checked !user.hashedPassword above)

  const isValid = await bcrypt.compare(data.current, user.hashedPassword);
  if (!isValid) throw new Error("Incorrect current password.");

  const hashed = await bcrypt.hash(data.newPass, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: { hashedPassword: hashed }
  });

  return { success: true };
}

export async function saveBookingConfiguration(data: { availability: any[]; consultationTypes: any[] }) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) throw new Error("Unauthorized");

  const profile = await prisma.consultantProfile.findUnique({
    where: { userId: (session!.user as any).id }
  });

  if (!profile) throw new Error("Profile not found");

  // Wipe and replace availability block
  await prisma.$transaction([
    prisma.weeklyAvailability.deleteMany({ where: { consultantProfileId: profile.id } }),
    prisma.weeklyAvailability.createMany({
      data: data.availability.map(a => ({
        consultantProfileId: profile.id,
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
        isActive: a.isActive
      }))
    })
  ]);

  // Upsert session types safely (preserving relations)
  for (const t of data.consultationTypes) {
    if (t.id.startsWith("new_")) {
      await prisma.consultationType.create({
        data: {
          consultantProfileId: profile.id,
          title: t.title,
          description: t.description || null,
          durationMinutes: Number(t.durationMinutes),
          priceCents: Number(t.priceCents),
          communicationType: t.communicationType,
          isActive: t.isActive
        }
      });
    } else {
      await prisma.consultationType.update({
        where: { id: t.id },
        data: {
          title: t.title,
          description: t.description || null,
          durationMinutes: Number(t.durationMinutes),
          priceCents: Number(t.priceCents),
          communicationType: t.communicationType,
          isActive: t.isActive
        }
      });
    }
  }

  revalidatePath("/dashboard/consultant/calendar");
  revalidatePath("/dashboard/consultant/settings");
  revalidatePath("/consultant/[slug]", "page");
  return { success: true };
}

export async function getAIEngines() {
  const contentSetting = await prisma.platformSetting.findUnique({ where: { key: "aiContentModel" } });
  const imageSetting = await prisma.platformSetting.findUnique({ where: { key: "aiImageModel" } });
  
  return {
    contentModel: contentSetting?.value || "gpt-4o",
    imageModel: imageSetting?.value || "FAL_FLUX_SCHNELL"
  };
}
