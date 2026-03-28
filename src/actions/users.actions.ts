"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);
const SENDER_EMAIL = "Verixa Administration <info@farjadp.info>";

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
export async function createUser(data: { name: string; email: string; password?: string; role: string; notifyUser?: boolean }) {
  await verifyAdmin();
  const { name, email, password, role, notifyUser } = data;

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    throw new Error("A user with this email already exists.");
  }

  const generatePassword = () => Math.random().toString(36).slice(2) + Date.now().toString();
  const rawPassword = password || generatePassword();
  const hashedPassword = await bcrypt.hash(rawPassword, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      role,
      hashedPassword,
    }
  });

  if (notifyUser) {
    try {
      await resend.emails.send({
        from: SENDER_EMAIL,
        to: email.toLowerCase(),
        subject: "Welcome to Verixa - Your Account Has Been Created",
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #0F2A44; margin-bottom: 20px;">Welcome to Verixa</h2>
            <p>Hello ${name || "there"},</p>
            <p>An administrator has provisioned a new account for you on the Verixa platform.</p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 25px 0;">
              <h3 style="margin-top: 0; font-size: 14px; color: #666; text-transform: uppercase;">Your Credentials</h3>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${email.toLowerCase()}</p>
              <p style="margin: 5px 0;"><strong>Temporary Password:</strong> ${rawPassword}</p>
              <p style="margin: 5px 0;"><strong>Access Level:</strong> ${role}</p>
            </div>
            <p>Please log in using the button below and change your password in your profile settings as soon as possible for security purposes.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://farjadp.info/login" style="background-color: #2FA4A9; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Log In to Your Account</a>
            </div>
            <p style="font-size: 12px; color: #888;">If you did not expect this invitation, please contact support.</p>
          </div>
        `
      });
    } catch (e) {
      console.error("Failed to send welcome email:", e);
    }
  }

  revalidatePath("/dashboard/admin/users");
  return user;
}

// 3. Update existing user details/role
export async function updateUser(id: string, data: { name: string; email: string; role: string; password?: string; notifyUser?: boolean }) {
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

  if (data.notifyUser) {
    try {
      await resend.emails.send({
        from: SENDER_EMAIL,
        to: data.email.toLowerCase(),
        subject: "Verixa Account Update Notification",
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #0F2A44; margin-bottom: 20px;">Account Modification Notice</h2>
            <p>Hello ${data.name || "there"},</p>
            <p>An administrator has updated your Verixa platform identity.</p>
            <ul style="margin: 20px 0;">
              <li><strong>Current Access Level:</strong> ${data.role}</li>
              ${data.password ? "<li><strong>Password:</strong> A new temporary password was set by the administrator. Please log in using the new credentials provided to you securely.</li>" : ""}
            </ul>
            <p>If you have any questions or did not authorize these changes, please contact support immediately.</p>
          </div>
        `
      });
    } catch (e) {
      console.error("Failed to send update email:", e);
    }
  }

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
