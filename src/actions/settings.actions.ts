"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { revalidatePath } from "next/cache";
import { logEvent } from "@/lib/logger";
import bcrypt from "bcryptjs";

export async function updateProfileSettings(data: { name: string; email: string }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) throw new Error("Unauthorized");

  // Check if new email is already in use by someone else
  if (data.email !== session.user.email) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new Error("Email is already in use by another account");
  }

  const updatedUser = await prisma.user.update({
    where: { email: session.user.email },
    data: {
      name: data.name,
      email: data.email,
    }
  });

  await logEvent({
    userId: updatedUser.id,
    role: updatedUser.role,
    action: "PROFILE_UPDATED",
    details: { updatedFields: Object.keys(data) }
  });

  revalidatePath("/dashboard/client/settings");
  revalidatePath("/dashboard");
  // Note: Changing the email might invalidate the current session in NextAuth depending on strategy.
  return { success: true };
}

export async function changePassword(data: { current: string; newPass: string }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || !user.hashedPassword) throw new Error("Account does not use a password.");

  const isValid = await bcrypt.compare(data.current, user.hashedPassword);
  if (!isValid) throw new Error("Incorrect current password.");

  const hashedNewPassword = await bcrypt.hash(data.newPass, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { hashedPassword: hashedNewPassword }
  });

  await logEvent({
    userId: user.id,
    role: user.role,
    action: "PASSWORD_CHANGED"
  });

  return { success: true };
}

export async function saveBookingConfiguration(data: { availability: any[], consultationTypes: any[] }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) throw new Error("User not found");

  const profile = await prisma.consultantProfile.findUnique({
    where: { userId: user.id }
  });

  if (!profile) throw new Error("Consultant Profile not found");

  await prisma.$transaction(async (tx) => {
    // 1. Update Availability
    for (const a of data.availability) {
      const existing = await tx.weeklyAvailability.findFirst({
        where: { consultantProfileId: profile.id, dayOfWeek: a.dayOfWeek }
      });
      if (existing) {
        await tx.weeklyAvailability.update({
          where: { id: existing.id },
          data: {
            isActive: a.isActive,
            startTime: a.startTime,
            endTime: a.endTime
          }
        });
      } else {
        await tx.weeklyAvailability.create({
          data: {
            consultantProfileId: profile.id,
            dayOfWeek: a.dayOfWeek,
            isActive: a.isActive,
            startTime: a.startTime,
            endTime: a.endTime
          }
        });
      }
    }

    // 2. Update Consultation Types
    for (const ct of data.consultationTypes) {
      if (ct.id.startsWith("new_")) {
        if (ct.isActive) {
          await tx.consultationType.create({
            data: {
              consultantProfileId: profile.id,
              title: ct.title,
              description: ct.description,
              durationMinutes: ct.durationMinutes,
              priceCents: ct.priceCents,
              communicationType: ct.communicationType,
              isActive: ct.isActive
            }
          });
        }
      } else {
        await tx.consultationType.update({
          where: { id: ct.id },
          data: {
            title: ct.title,
            description: ct.description,
            durationMinutes: ct.durationMinutes,
            priceCents: ct.priceCents,
            communicationType: ct.communicationType,
            isActive: ct.isActive
          }
        });
      }
    }
  });

  revalidatePath("/dashboard/booking");
  revalidatePath(`/consultant/${profile.licenseNumber}`);
  return { success: true };
}
