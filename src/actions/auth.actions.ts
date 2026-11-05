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

export type RegisterResult = { success: true } | { success: false; error: string };

// Returns a result object instead of throwing: Next.js strips thrown error
// messages from server actions in production, so the user would see nothing.
export async function registerUser(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: "client" | "consultant";
  licenseNumber?: string;
}): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid registration data" };
  }
  const data = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return { success: false, error: "User with this email already exists" };
  }

  const licenseNumber =
    data.role === "consultant" && data.licenseNumber ? data.licenseNumber.toUpperCase() : null;

  // Security: registration NEVER links an existing registry profile, claimed or
  // not. Every registry row (there are ~9,900, seeded from CICC) is only
  // transferable through the OTP-verified /claim/[license] flow. Linking an
  // unclaimed row here would let anyone squat a real consultant's bookings.
  if (licenseNumber) {
    const profile = await prisma.consultantProfile.findUnique({
      where: { licenseNumber },
      select: { id: true },
    });
    if (profile) {
      return {
        success: false,
        error:
          "This license number is already in our registry. Use “Claim your profile” to verify it is yours, or contact support.",
      };
    }
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);
  const name = `${data.firstName} ${data.lastName}`;

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email: data.email,
          hashedPassword,
          role: data.role === "consultant" ? "CONSULTANT" : "USER",
        },
      });

      if (!licenseNumber) return;

      // A license not in the registry: create a fresh, unverified profile.
      // The @unique on licenseNumber makes a concurrent claim roll this back.
      await tx.consultantProfile.create({
        data: {
          userId: user.id,
          fullName: name,
          slug: name.toLowerCase().replace(/\s+/g, "-") + "-" + licenseNumber.toLowerCase(),
          licenseNumber,
          status: "Active",
          verificationLevel: "PENDING_REVIEW",
        },
      });
    });
  } catch (e) {
    console.error("[registerUser] failed:", e);
    return { success: false, error: "Registration failed. Please try again." };
  }

  return { success: true };
}
