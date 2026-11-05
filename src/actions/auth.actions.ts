"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  role: z.enum(["client", "consultant"]),
  licenseNumber: z.string().trim().max(32).optional(),
});

export async function registerUser(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: "client" | "consultant";
  licenseNumber?: string;
}) {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid registration data");
  }
  const data = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw new Error("User with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);
  const name = `${data.firstName} ${data.lastName}`;
  const roleEnum = data.role === "consultant" ? "CONSULTANT" : "USER";
  const licenseNumber =
    roleEnum === "CONSULTANT" && data.licenseNumber ? data.licenseNumber.toUpperCase() : null;

  // Security: a registry profile that is already linked to a user can never be
  // re-linked from the public registration form. Claimed profiles are only
  // transferable through the OTP-verified /claim/[license] flow.
  if (licenseNumber) {
    const profile = await prisma.consultantProfile.findUnique({
      where: { licenseNumber },
      select: { userId: true },
    });
    if (profile?.userId) {
      throw new Error(
        "This license number is already linked to an account. If this is your license, use the Claim Profile flow or contact support."
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email: data.email,
        hashedPassword,
        role: roleEnum,
      },
    });

    if (!licenseNumber) return;

    // Link only if the profile is still unclaimed at write time (guards the race
    // between the check above and this write).
    const linked = await tx.consultantProfile.updateMany({
      where: { licenseNumber, userId: null },
      data: { userId: user.id },
    });

    if (linked.count === 1) return;

    const exists = await tx.consultantProfile.findUnique({
      where: { licenseNumber },
      select: { id: true },
    });
    if (exists) {
      // Claimed between check and write: abort the whole registration.
      throw new Error("This license number is already linked to an account.");
    }

    await tx.consultantProfile.create({
      data: {
        userId: user.id,
        fullName: name,
        slug: name.toLowerCase().replace(/\s+/g, "-") + "-" + licenseNumber.toLowerCase(),
        licenseNumber,
        status: "Active",
      },
    });
  });

  return { success: true };
}
