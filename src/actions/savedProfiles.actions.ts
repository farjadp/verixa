"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { revalidatePath } from "next/cache";
import { getConsultantBookingConfig } from "./booking.actions";
import { trackEvent } from "./analytics.actions";

export async function toggleSaveProfile(consultantLicenseNumber: string) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user?.email) {
    throw new Error("Must be logged in to save profiles");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Ensure consultant exists in DB
  const consultant = await getConsultantBookingConfig(consultantLicenseNumber);

  if (!consultant) {
    throw new Error("Consultant not found");
  }

  // Check if already saved
  const existing = await prisma.savedProfile.findUnique({
    where: {
      userId_consultantProfileId: {
        userId: user.id,
        consultantProfileId: consultant.id
      }
    }
  });

  if (existing) {
    // Unsave
    await prisma.savedProfile.delete({
      where: { id: existing.id }
    });
  } else {
    // Save
    await prisma.savedProfile.create({
      data: {
        userId: user.id,
        consultantProfileId: consultant.id
      }
    });

    // Analytics: track profile_save
    await trackEvent({
      eventName: "profile_save",
      consultantId: consultant.id
    });
  }

  revalidatePath(`/consultant/${consultantLicenseNumber}`);
  revalidatePath(`/dashboard/client/saved`);
  revalidatePath(`/dashboard`);
  
  return !existing; // Returns true if it became saved, false if it became unsaved
}

export async function checkIsSaved(consultantLicenseNumber: string) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) return false;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!user) return false;

  // Only check if it exists in DB, don't auto-provision on simple read
  const consultant = await prisma.consultantProfile.findUnique({
    where: { licenseNumber: consultantLicenseNumber }
  });

  if (!consultant) return false;

  const existing = await prisma.savedProfile.findUnique({
    where: {
      userId_consultantProfileId: {
        userId: user.id,
        consultantProfileId: consultant.id
      }
    }
  });

  return !!existing;
}
