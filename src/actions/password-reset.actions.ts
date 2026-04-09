"use server";

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mailer";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// ── Generate a secure token, store it, and email the reset link
export async function requestPasswordReset(email: string) {
  const normalised = email.toLowerCase().trim();

  // Always return success to prevent email enumeration
  const user = await prisma.user.findUnique({ where: { email: normalised } });
  if (!user) return { success: true };

  // Invalidate any existing unused tokens for this email
  await prisma.passwordResetToken.updateMany({
    where: { email: normalised, used: false },
    data: { used: true },
  });

  // Create a new token (expires in 1 hour)
  const rawToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: { token: rawToken, email: normalised, expiresAt },
  });

  const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const resetLink = `${BASE_URL}/reset-password/${rawToken}`;
  const name = user.name?.split(" ")[0] || "there";

  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; background: #F8FAFC; border-radius: 16px;">
      <div style="background: #0F2A44; padding: 32px; border-radius: 12px 12px 0 0; text-align: center; border-top: 4px solid #2FA4A9;">
        <h1 style="color: #fff; font-size: 22px; margin: 0; font-weight: 800; letter-spacing: -0.5px;">Reset Your Password</h1>
      </div>
      <div style="background: #fff; padding: 40px; border-radius: 0 0 12px 12px; border: 1px solid #E2E8F0; border-top: none;">
        <p style="color: #334155; font-size: 16px; line-height: 1.7; margin: 0 0 24px;">Hi ${name},</p>
        <p style="color: #334155; font-size: 16px; line-height: 1.7; margin: 0 0 24px;">
          We received a request to reset your password. Click the button below to choose a new one.
          This link is valid for <strong>1 hour</strong>.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetLink}" style="display: inline-block; background: #0F2A44; color: #fff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 16px 36px; border-radius: 10px;">
            Reset My Password
          </a>
        </div>
        <p style="color: #64748B; font-size: 14px; line-height: 1.6; margin: 0;">
          If you didn't request this, you can safely ignore this email — your password won't change.
        </p>
        <hr style="border: none; border-top: 1px solid #F1F5F9; margin: 32px 0;" />
        <p style="color: #94A3B8; font-size: 12px;">
          Or copy this link into your browser:<br/>
          <a href="${resetLink}" style="color: #2FA4A9; word-break: break-all;">${resetLink}</a>
        </p>
      </div>
    </div>
  `;

  const result = await sendEmail({
    to: normalised,
    subject: "Reset your Verixa password",
    html,
    from: "Verixa <noreply@getverixa.com>",
    type: "PASSWORD_RESET",
  });

  if (!result.success) {
    console.error("[Password Reset] Email delivery failed:", result.error);
    throw new Error("Failed to send reset email. Please try again later.");
  }

  return { success: true };
}

// ── Validate the token and update the password
export async function resetPassword(token: string, newPassword: string) {
  if (!token || !newPassword || newPassword.length < 8) {
    throw new Error("Invalid request.");
  }

  const record = await prisma.passwordResetToken.findUnique({ where: { token } });

  if (!record) throw new Error("Invalid or expired reset link.");
  if (record.used) throw new Error("This reset link has already been used.");
  if (record.expiresAt < new Date()) throw new Error("This reset link has expired. Please request a new one.");

  const user = await prisma.user.findUnique({ where: { email: record.email } });
  if (!user) throw new Error("Account not found.");

  const hashed = await bcrypt.hash(newPassword, 12);

  // Update password and mark token as used atomically
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { hashedPassword: hashed },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { used: true },
    }),
  ]);

  return { success: true };
}

// ── Check if a token is valid (used by the reset-password page on load)
export async function verifyResetToken(token: string) {
  if (!token) return { valid: false, reason: "No token provided." };

  const record = await prisma.passwordResetToken.findUnique({ where: { token } });

  if (!record || record.used) return { valid: false, reason: "Invalid or already-used link." };
  if (record.expiresAt < new Date()) return { valid: false, reason: "This link has expired." };

  return { valid: true };
}
