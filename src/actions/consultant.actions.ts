"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { hasFeature } from "@/lib/subscription";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { bioTextLength, isSafeImageUrl, normalizeWebsite, parseLimit, sanitizeBio } from "@/lib/profile-content";

export async function getMyConsultantProfile() {
  const session = await getServerSession(authOptions);
  let userId = (session?.user as any)?.id;
  if (!userId) throw new Error("Unauthorized");

  const profile = await prisma.consultantProfile.findUnique({
    where: { userId: userId },
    include: { companyEnrichments: true }
  });

  if (!profile) throw new Error("Profile not found");

  const unlimitedFeature = await hasFeature(userId, "unlimited_messengers");
  const specLimit = await hasFeature(userId, "max_specializations");
  
  // Custom bio feature limit
  const bioFeature = await hasFeature(userId, "custom_bio");
  
  return {
    profile,
    canHaveUnlimitedMessengers: unlimitedFeature?.enabled || false,
    canHaveUnlimitedSpecializations: specLimit?.enabled ? parseLimit(specLimit.value, 3) > 3 : false,
    bioFeature: bioFeature?.enabled ? bioFeature.value : null
  };
}

export type UpdateProfileResult = { success: true } | { success: false; error: string };

const MESSENGER_TYPES = new Set(["whatsapp", "telegram", "wechat", "signal", "viber", "line", "skype", "imo", "botim"]);

// Returns a result: Next.js hides thrown messages from server actions in production.
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
}): Promise<UpdateProfileResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return { success: false, error: "Please sign in again." };

  const profile = await prisma.consultantProfile.findUnique({ where: { userId } });
  if (!profile) return { success: false, error: "Consultant profile not found." };

  const update: Prisma.ConsultantProfileUpdateInput = {};

  for (const key of ["avatarImage", "coverImage"] as const) {
    const value = data[key];
    if (value === undefined) continue;
    if (!isSafeImageUrl(value)) return { success: false, error: "Upload images through the profile editor." };
    update[key] = value || null;
  }

  if (data.website !== undefined) {
    const website = normalizeWebsite(data.website);
    if (website === null) return { success: false, error: "Enter a valid website address, e.g. https://example.com" };
    update.website = website || null;
  }

  if (data.languages !== undefined) {
    const langs = data.languages.split(",").map((l) => l.trim()).filter(Boolean).slice(0, 20);
    update.languages = langs.join(", ") || null;
  }

  if (data.messengers !== undefined) {
    if (!Array.isArray(data.messengers) || data.messengers.length > 10) {
      return { success: false, error: "Too many messaging apps." };
    }
    const messengers = data.messengers
      .map((m) => ({ type: String(m?.type ?? "").trim().slice(0, 20), value: String(m?.value ?? "").trim().slice(0, 120) }))
      .filter((m) => m.value);
    if (messengers.some((m) => !MESSENGER_TYPES.has(m.type.toLowerCase()))) {
      return { success: false, error: "Unsupported messaging app." };
    }
    if (messengers.length > 1) {
      const canHaveUnlimited = await hasFeature(userId, "unlimited_messengers");
      if (!canHaveUnlimited?.enabled) {
        return { success: false, error: "Your current plan allows 1 messaging app. Upgrade to add more." };
      }
    }
    update.messengers = messengers;
  }

  if (data.offersInPerson !== undefined) {
    const address = (data.officeAddress ?? "").trim().slice(0, 300);
    if (data.offersInPerson && !address) {
      return { success: false, error: "Add an office address for in-person consultations." };
    }
    update.offersInPerson = data.offersInPerson;
    update.officeAddress = data.offersInPerson ? address : null;
  }

  if (data.bio !== undefined) {
    const bioFeature = await hasFeature(userId, "custom_bio");
    if (!bioFeature?.enabled) {
      return { success: false, error: "Your current plan doesn't include a custom bio." };
    }
    let maxLength = 500;
    if (bioFeature.value === "unlimited") maxLength = Infinity;
    else if (bioFeature.value) {
      try {
        const parsed = JSON.parse(bioFeature.value);
        if (parsed?.maxLength) maxLength = Number(parsed.maxLength);
      } catch {
        maxLength = parseLimit(bioFeature.value, 500);
      }
    }
    const cleanBio = sanitizeBio(data.bio);
    if (bioTextLength(cleanBio) > maxLength) {
      return { success: false, error: `Your bio is over the ${maxLength}-character limit for your plan.` };
    }
    update.bio = cleanBio || null;
  }

  if (data.specializations !== undefined) {
    let specs: unknown = [];
    try {
      specs = JSON.parse(data.specializations);
    } catch {
      return { success: false, error: "Invalid specializations." };
    }
    if (!Array.isArray(specs) || specs.some((k) => typeof k !== "string" || k.length > 80)) {
      return { success: false, error: "Invalid specializations." };
    }
    const limitFeature = await hasFeature(userId, "max_specializations");
    const limit = limitFeature?.enabled ? parseLimit(limitFeature.value, 3) : 3;
    if (specs.length > limit) {
      return { success: false, error: `Your plan allows up to ${limit} specializations. Upgrade to add more.` };
    }
    update.specializations = JSON.stringify([...new Set(specs as string[])]);
  }

  await prisma.consultantProfile.update({ where: { id: profile.id }, data: update });

  revalidatePath("/dashboard/profile");
  revalidatePath(`/consultant/${profile.licenseNumber}`);
  return { success: true };
}
