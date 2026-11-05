"use server";

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mailer";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { passwordSchema } from "@/lib/booking-config-schema";

// Only a SHA-256 of the token is stored, so a database leak can't be used to
// reset anyone's password. The raw token exists only in the emailed link.
function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

// ── Generate a secure token, store it, and email the reset link
export async function requestPasswordReset(email: string) {
  const normalised = String(email ?? "").toLowerCase().trim();
  if (!normalised || normalised.length > 200) return { success: true };

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

  // At most 3 reset emails per address per hour.
  const recent = await prisma.passwordResetToken.count({
    where: { email: normalised, createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  if (recent >= 3) return { success: true };

  await prisma.passwordResetToken.create({
    data: { token: hashToken(rawToken), email: normalised, expiresAt },
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
    // Same response as for unknown emails: an error here would reveal the account exists.
    console.error("[Password Reset] Email delivery failed:", result.error);
  }

  return { success: true };
}

// ── Validate the token and update the password
export async function resetPassword(token: string, newPassword: string): Promise<{ success: true } | { success: false; error: string }> {
  const pw = passwordSchema.safeParse(newPassword);
  if (!token || !pw.success) return { success: false, error: pw.success ? "Invalid request." : pw.error.issues[0]?.message || "Invalid password." };

  const record = await prisma.passwordResetToken.findUnique({ where: { token: hashToken(token) } });
  if (!record || record.used || record.expiresAt < new Date()) {
    return { success: false, error: "This reset link is invalid or has expired. Please request a new one." };
  }

  const user = await prisma.user.findUnique({ where: { email: record.email }, select: { id: true } });
  if (!user) return { success: false, error: "This reset link is invalid or has expired. Please request a new one." };

  const hashed = await bcrypt.hash(pw.data, 12);
  try {
    await prisma.$transaction(async (tx) => {
      // Consume the token atomically: a second concurrent use finds count === 0.
      const consumed = await tx.passwordResetToken.updateMany({
        where: { id: record.id, used: false, expiresAt: { gt: new Date() } },
        data: { used: true },
      });
      if (consumed.count === 0) throw new Error("TOKEN_USED");
      await tx.user.update({ where: { id: user.id }, data: { hashedPassword: hashed } });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "TOKEN_USED") {
      return { success: false, error: "This reset link has already been used." };
    }
    console.error("[resetPassword] failed:", e);
    return { success: false, error: "Could not reset your password. Please try again." };
  }
  return { success: true };
}

// ── Check if a token is valid (used by the reset-password page on load)
export async function verifyResetToken(token: string) {
  if (!token) return { valid: false, reason: "No token provided." };
  const record = await prisma.passwordResetToken.findUnique({ where: { token: hashToken(token) } });
  if (!record || record.used) return { valid: false, reason: "This link is invalid or has already been used." };
  if (record.expiresAt < new Date()) return { valid: false, reason: "This link has expired." };
  return { valid: true };
}
