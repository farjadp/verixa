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
          <div style="background-color: #030712; background-image: radial-gradient(circle at top right, #1e3a5f, #030712 70%); margin: 0; padding: 50px 20px; font-family: 'Helvetica Neue', Arial, sans-serif; color: #f1f5f9; min-height: 100vh;">
            <div style="max-width: 600px; margin: 0 auto; background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 24px; padding: 40px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
              
              <!-- Logo / Header -->
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #ffffff; font-size: 28px; font-weight: 900; letter-spacing: -0.5px; margin: 0;">
                  VERIXA <span style="background: linear-gradient(90deg, #2FA4A9, #4FD1C5); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">NETWORK</span>
                </h1>
                <p style="color: #94a3b8; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; margin-top: 5px; font-weight: 600;">IDENTITY PROVISIONED</p>
              </div>

              <!-- Content -->
              <div style="font-size: 15px; color: #cbd5e1; line-height: 1.7;">
                <p style="font-size: 18px; color: #ffffff; font-weight: 500;">Hello ${name || "there"},</p>
                <p>An administrator has successfully provisioned a highly secured account for you within the Verixa infrastructure.</p>
                
                <!-- Credentials Box -->
                <div style="background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(47, 164, 169, 0.3); border-radius: 16px; padding: 25px; margin: 35px 0; border-left: 4px solid #2FA4A9;">
                  <p style="margin: 0 0 15px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #2FA4A9; font-weight: 700;">Encrypted Credentials</p>
                  
                  <div style="margin-bottom: 15px;">
                    <span style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Access Identity (Email)</span><br/>
                    <span style="font-size: 16px; color: #ffffff; font-weight: 600;">${email.toLowerCase()}</span>
                  </div>
                  
                  <div style="margin-bottom: 15px;">
                    <span style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Temporary Cipher</span><br/>
                    <span style="font-family: monospace; font-size: 18px; color: #4FD1C5; background: rgba(79, 209, 197, 0.1); padding: 4px 10px; border-radius: 6px; letter-spacing: 2px;">${rawPassword}</span>
                  </div>

                  <div>
                    <span style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Clearance Level</span><br/>
                    <span style="display: inline-block; background: rgba(255, 255, 255, 0.1); color: #ffffff; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 20px; letter-spacing: 1px; margin-top: 4px;">${role}</span>
                  </div>
                </div>

                <p>Please initialize your session using the button below. You will be requested to establish a permanent cipher upon first entry.</p>

                <!-- Button -->
                <div style="text-align: center; margin: 45px 0 20px 0;">
                  <a href="https://farjadp.info/login" style="display: inline-block; background: linear-gradient(135deg, #2FA4A9 0%, #1e878c 100%); color: #ffffff; font-size: 15px; font-weight: bold; text-decoration: none; padding: 16px 40px; border-radius: 50px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 10px 25px -5px rgba(47, 164, 169, 0.4);">Initialize Session</a>
                </div>
              </div>
              
              <!-- Footer -->
              <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.05); text-align: center; font-size: 12px; color: #64748b;">
                <p>Strictly Confidential. If you are not the intended recipient, please destroy this transmission immediately.</p>
                <p style="margin-top: 10px;">&copy; ${new Date().getFullYear()} Verixa Technologies. All systems nominal.</p>
              </div>
            </div>
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
          <div style="background-color: #0a0a0a; background-image: radial-gradient(circle at top left, #1a2e3f, #0a0a0a 60%); margin: 0; padding: 50px 20px; font-family: 'Helvetica Neue', Arial, sans-serif; color: #f1f5f9; min-height: 100vh;">
            <div style="max-width: 600px; margin: 0 auto; background: rgba(255, 255, 255, 0.02); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 20px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
              
              <div style="display: flex; align-items: center; margin-bottom: 30px;">
                <div style="width: 40px; height: 40px; border-radius: 8px; background: rgba(47, 164, 169, 0.2); border: 1px solid #2FA4A9; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
                   <span style="color: #2FA4A9; font-size: 20px; font-weight: bold;">⚠️</span>
                </div>
                <div>
                  <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">SYSTEM UPDATE</h2>
                  <p style="margin: 3px 0 0 0; color: #64748b; font-size: 13px; text-transform: uppercase;">Identity Modification Detected</p>
                </div>
              </div>

              <div style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">
                <p>Hello <span style="color: #ffffff; font-weight: 500;">${data.name || "there"}</span>,</p>
                <p>An authorized administrator has altered your identity parameters on the Verixa Platform.</p>
                
                <div style="margin: 30px 0; border-top: 1px solid rgba(255,255,255,0.1); border-bottom: 1px solid rgba(255,255,255,0.1); padding: 20px 0;">
                  <div style="margin-bottom: 12px; display: flex; box-sizing: border-box;">
                    <span style="color: #94a3b8; width: 150px; text-transform: uppercase; font-size: 11px; font-weight: 700; letter-spacing: 1px;">Access Level</span>
                    <span style="color: #ffffff; font-weight: 600; font-size: 14px; background: rgba(255,255,255,0.1); padding: 3px 10px; border-radius: 6px;">${data.role}</span>
                  </div>
                  ${data.password ? `
                    <div style="margin-top: 15px; background: rgba(220, 38, 38, 0.1); border-left: 3px solid #ef4444; padding: 12px 15px; border-radius: 0 8px 8px 0;">
                      <span style="color: #fca5a5; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Security Alert</span><br/>
                      <span style="color: #ffffff; font-size: 14px;">A new temporary cipher (password) was enforced. Obtain it securely from your administrator to restore access.</span>
                    </div>
                  ` : ""}
                </div>

                <p style="font-size: 13px; color: #94a3b8; font-style: italic;">If this modification was unauthorized or unexpected, immediately alert Verixa SecOps.</p>
              </div>
            </div>
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
