"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function registerUser(data: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: "client" | "consultant";
  licenseNumber?: string;
}) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() }
  });

  if (existing) {
    throw new Error("User with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);
  const name = `${data.firstName} ${data.lastName}`;
  const roleEnum = data.role === "consultant" ? "CONSULTANT" : "USER";

  const user = await prisma.user.create({
    data: {
      name,
      email: data.email.toLowerCase(),
      hashedPassword,
      role: roleEnum,
    }
  });

  if (roleEnum === "CONSULTANT" && data.licenseNumber) {
    await prisma.consultantProfile.upsert({
      where: { licenseNumber: data.licenseNumber.toUpperCase() },
      update: { userId: user.id },
      create: {
        userId: user.id,
        fullName: name,
        slug: name.toLowerCase().replace(/\s+/g, '-') + '-' + data.licenseNumber.toLowerCase(),
        licenseNumber: data.licenseNumber.toUpperCase(),
        status: "Active",
      }
    });
  }

  return { success: true };
}
