"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { revalidatePath } from "next/cache";

// Utility: verify admin privileges
const verifyAdmin = async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }
};

// 1. Fetch all users
export async function getAllUsers() {
  await verifyAdmin();
  return prisma.user.findMany({
    include: {
      _count: {
        select: { savedProfiles: true, reviews: true, blogPosts: true }
      },
      systemLogs: {
        take: 1,
        orderBy: { createdAt: "desc" }
      }
    },
    orderBy: { createdAt: "desc" }
  });
}

// 2. Create User Manually
export async function createUser(data: { name: string; email: string; password?: string; role: string }) {
  await verifyAdmin();
  const { name, email, password, role } = data;

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    throw new Error("A user with this email already exists.");
  }

  let hashedPassword = null;
  if (password) {
    hashedPassword = await bcrypt.hash(password, 10);
  } else {
    // If no password provided, generate a random secure hash to prevent null issues, though auth might block
    hashedPassword = await bcrypt.hash(Math.random().toString(36).slice(2) + Date.now().toString(), 10);
  }

  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      role,
      hashedPassword,
    }
  });

  revalidatePath("/dashboard/admin/users");
  return user;
}

// 3. Update existing user details/role
export async function updateUser(id: string, data: { name: string; email: string; role: string; password?: string }) {
  await verifyAdmin();

  // If email changes, check if taken
  const existingUser = await prisma.user.findUnique({ where: { id } });
  if (!existingUser) throw new Error("User not found.");

  if (data.email.toLowerCase() !== existingUser.email?.toLowerCase()) {
    const emailTaken = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (emailTaken) throw new Error("Email is already taken by another user.");
  }

  const updateData: any = {
    name: data.name,
    email: data.email.toLowerCase(),
    role: data.role,
  };

  if (data.password && data.password.trim() !== "") {
    updateData.hashedPassword = await bcrypt.hash(data.password, 10);
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData
  });

  revalidatePath("/dashboard/admin/users");
  return user;
}

// 4. Delete User (Hard Delete for simplicity right now, due to prisma constraints)
export async function deleteUser(id: string) {
  await verifyAdmin();

  // Ensure an admin doesn't delete themselves
  const session = await getServerSession(authOptions);
  if ((session?.user as any).id === id) {
    throw new Error("You cannot delete your own admin account.");
  }

  // To delete a user, we must first delete their associated relational data or rely on onDelete: Cascade.
  // Checking Prisma schema: Most relations in Verixa User are NOT cascaded natively, so manual cleanup might be needed.
  // We'll wrap in a transaction to safely attempt cascade drops:
  await prisma.$transaction(async (tx) => {
    // Delete Logs
    await tx.systemLog.deleteMany({ where: { userId: id } });
    // Delete Profiles
    await tx.clientProfile.deleteMany({ where: { userId: id } });
    await tx.consultantProfile.deleteMany({ where: { userId: id } });
    // Delete User
    await tx.user.delete({ where: { id } });
  });

  revalidatePath("/dashboard/admin/users");
  return true;
}
