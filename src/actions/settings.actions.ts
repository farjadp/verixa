"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { bookingConfigurationSchema, passwordSchema } from "@/lib/booking-config-schema";

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
  revalidatePath("/");
  revalidatePath("/", "layout");

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

export type SettingsResult = { success: true } | { success: false; error: string };

// Name only. Bookings, reviews and the client dossier are keyed on email, so
// letting users change it without verifying the new address would let anyone
// take over a guest's bookings by typing that guest's email. Email changes go
// through support until a verified change flow exists.
export async function updateProfileSettings(data: { name: string; email?: string }): Promise<SettingsResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Please sign in again." };

  const name = String(data?.name ?? "").trim();
  if (!name || name.length > 120) return { success: false, error: "Enter your name (up to 120 characters)." };
  if (data.email && data.email.trim().toLowerCase() !== (session.user.email ?? "").toLowerCase()) {
    return { success: false, error: "To change your email address, contact support so we can verify the new address." };
  }

  await prisma.user.update({ where: { id: session.user.id }, data: { name } });

  revalidatePath("/dashboard/client/settings");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function changePassword(data: { current: string; newPass: string }): Promise<SettingsResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Please sign in again." };

  const parsed = passwordSchema.safeParse(data?.newPass);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Invalid password." };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.hashedPassword) return { success: false, error: "This account has no password set. Use “Forgot password” to create one." };

  const isValid = await bcrypt.compare(String(data.current ?? ""), user.hashedPassword);
  if (!isValid) return { success: false, error: "Your current password is incorrect." };

  await prisma.user.update({
    where: { id: user.id },
    data: { hashedPassword: await bcrypt.hash(parsed.data, 12) },
  });
  return { success: true };
}

export async function saveBookingConfiguration(input: unknown): Promise<SettingsResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "CONSULTANT") {
    return { success: false, error: "Only consultants can change booking settings." };
  }

  const parsed = bookingConfigurationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid booking configuration." };
  }
  const data = parsed.data;

  const profile = await prisma.consultantProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, licenseNumber: true },
  });
  if (!profile) return { success: false, error: "Consultant profile not found." };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.weeklyAvailability.deleteMany({ where: { consultantProfileId: profile.id } });
      if (data.availability.length > 0) {
        await tx.weeklyAvailability.createMany({
          data: data.availability.map((a) => ({ consultantProfileId: profile.id, ...a })),
        });
      }

      for (const t of data.consultationTypes) {
        const fields = {
          title: t.title,
          description: t.description || null,
          durationMinutes: t.durationMinutes,
          priceCents: t.priceCents,
          communicationType: t.communicationType,
          isActive: t.isActive,
        };
        if (t.id.startsWith("new_")) {
          await tx.consultationType.create({ data: { consultantProfileId: profile.id, ...fields } });
        } else {
          // Ownership: only this consultant's own types can be edited.
          const res = await tx.consultationType.updateMany({
            where: { id: t.id, consultantProfileId: profile.id },
            data: fields,
          });
          if (res.count === 0) throw new Error("FOREIGN_TYPE");
        }
      }
    });
  } catch (e) {
    if (e instanceof Error && e.message === "FOREIGN_TYPE") {
      return { success: false, error: "One of the consultation types doesn't belong to your profile." };
    }
    console.error("[saveBookingConfiguration] failed:", e);
    return { success: false, error: "Could not save your booking settings. Please try again." };
  }

  revalidatePath("/dashboard/booking");
  revalidatePath(`/consultant/${profile.licenseNumber}`);
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
