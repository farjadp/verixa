"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { hasFeature } from "@/lib/subscription";
import { revalidatePath } from "next/cache";
import DOMPurify from 'isomorphic-dompurify';

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
  
  // Custom bio feature limit
  const bioFeature = await hasFeature(userId, "custom_bio");
  
  return {
    profile,
    canHaveUnlimitedMessengers: unlimitedFeature?.enabled || false,
    bioFeature: bioFeature?.enabled ? bioFeature.value : null
  };
}

export async function updateConsultantProfile(data: {
  coverImage?: string;
  avatarImage?: string;
  website?: string;
  languages?: string;
  messengers?: { type: string; value: string }[];
  specializations?: string;       // JSON string of string[]
  offersInPerson?: boolean;
  officeAddress?: string;
  bio?: string;
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

  // Validate in-person address
  if (data.offersInPerson && !data.officeAddress?.trim()) {
    throw new Error("Please provide an office address for in-person consultations.");
  }

  // Validate Bio and Sanitize
  let cleanBio = profile.bio;
  if (data.bio !== undefined) {
    const bioFeature = await hasFeature(userId, "custom_bio");
    if (!bioFeature?.enabled) {
      throw new Error("Your current plan does not support custom processing.");
    }

    // Determine limits
    let maxLength = 0;
    let isUnlimited = false;

    if (bioFeature.value === "unlimited") {
      isUnlimited = true;
    } else if (bioFeature.value) {
      try {
        const parsed = JSON.parse(bioFeature.value);
        if (parsed.maxLength) maxLength = parsed.maxLength;
      } catch (e) {
        maxLength = 500; // fallback
      }
    }

    // Strip HTML to count text accurately (simple fallback for character count)
    const rawTextLength = data.bio.replace(/<[^>]*>?/gm, '').length;
    
    if (!isUnlimited && maxLength > 0 && rawTextLength > maxLength) {
      throw new Error(`Your Professional Bio exceeds the ${maxLength} character limit for your current plan.`);
    }

    // Sanitize with DOMPurify
    cleanBio = DOMPurify.sanitize(data.bio, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'span'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
    });
  }

  await (prisma as any).consultantProfile.update({
    where: { id: profile.id },
    data: {
      coverImage: data.coverImage !== undefined ? data.coverImage : profile.coverImage,
      avatarImage: data.avatarImage !== undefined ? data.avatarImage : profile.avatarImage,
      website: data.website !== undefined ? data.website : profile.website,
      languages: data.languages !== undefined ? data.languages : profile.languages,
      messengers: data.messengers !== undefined ? (data.messengers as any) : profile.messengers,
      specializations: data.specializations !== undefined ? data.specializations : (profile as any).specializations,
      offersInPerson: data.offersInPerson !== undefined ? data.offersInPerson : (profile as any).offersInPerson,
      officeAddress: data.officeAddress !== undefined ? data.officeAddress : (profile as any).officeAddress,
      bio: cleanBio,
    }
  });

  revalidatePath("/dashboard/profile");
  return { success: true };
}
