"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { revalidatePath } from "next/cache";

export async function updateClientProfile(data: {
  nationality?: string;
  languages?: string;
  currentCountry?: string;
  immigrationGoals?: string;
  educationLevel?: string;
  maritalStatus?: string;
  age?: number;
  shareWithConsultant: boolean;
}) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!user) throw new Error("User not found");

  const profile = await prisma.clientProfile.upsert({
    where: { userId: user.id },
    update: data,
    create: {
      userId: user.id,
      ...data
    }
  });

  revalidatePath("/dashboard/client/profile");
  revalidatePath("/dashboard");
  return { success: true, profile };
}
