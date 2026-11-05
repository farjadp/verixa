"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { revalidatePath } from "next/cache";
import { clientProfileSchema } from "@/lib/booking-config-schema";

export type ClientProfileResult = { success: true } | { success: false; error: string };

export async function updateClientProfile(input: unknown): Promise<ClientProfileResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Please sign in again." };

  // Whitelist: the old code spread the raw object into Prisma, so a nested
  // `user: { update: { role: "ADMIN" } }` could promote the caller.
  const parsed = clientProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid profile details." };
  }
  const data = parsed.data;

  await prisma.clientProfile.upsert({
    where: { userId: session.user.id },
    update: data,
    create: { userId: session.user.id, ...data },
  });

  revalidatePath("/dashboard/client/profile");
  revalidatePath("/dashboard");
  return { success: true };
}
