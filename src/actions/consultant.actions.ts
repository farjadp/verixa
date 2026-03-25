"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { hasFeature } from "@/lib/subscription";
import { revalidatePath } from "next/cache";

export async function getMyConsultantProfile() {
  const session = await getServerSession(authOptions);
  let userId = (session?.user as any)?.id;
  if (!userId) throw new Error("Unauthorized");

  const profile = await prisma.consultantProfile.findUnique({
    where: { userId: userId },
    include: { companyEnrichments: true }
  });

  if (!profile) throw new Error("Profile not found");

  // Also return if they have unlimited messengers feature
  const unlimitedFeature = await hasFeature(userId, "unlimited_messengers");
  
  return {
    profile,
    canHaveUnlimitedMessengers: unlimitedFeature?.enabled || false
  };
}

export async function updateConsultantProfile(data: {
  coverImage?: string;
  avatarImage?: string;
  website?: string;
  languages?: string;
  messengers?: { type: string; value: string }[];
}) {
  const session = await getServerSession(authOptions);
  let userId = (session?.user as any)?.id;
  if (!userId) throw new Error("Unauthorized");

  const profile = await prisma.consultantProfile.findUnique({
    where: { userId: userId }
  });

  if (!profile) throw new Error("Profile not found");

  // Validate Messengers based on Plan
  if (data.messengers && data.messengers.length > 1) {
    const canHaveUnlimited = await hasFeature(userId, "unlimited_messengers");
    if (!canHaveUnlimited?.enabled) {
      throw new Error("Your current plan only allows 1 messaging app. Upgrade to PRO for unlimited.");
    }
  }

  await prisma.consultantProfile.update({
    where: { id: profile.id },
    data: {
      coverImage: data.coverImage !== undefined ? data.coverImage : profile.coverImage,
      avatarImage: data.avatarImage !== undefined ? data.avatarImage : profile.avatarImage,
      website: data.website !== undefined ? data.website : profile.website,
      languages: data.languages !== undefined ? data.languages : profile.languages,
      messengers: data.messengers !== undefined ? (data.messengers as any) : profile.messengers,
    }
  });

  revalidatePath("/dashboard/profile");
  return { success: true };
}
