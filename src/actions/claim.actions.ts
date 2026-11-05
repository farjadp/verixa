"use server";

import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { escapeHtml } from "@/lib/mailer";
import { logEvent } from "@/lib/logger";
import { canClaimWithAccount, decideClaim, OTP_LIMITS, verificationLevelFor } from "@/lib/claim-rules";

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = (process.env.NEXTAUTH_URL || "https://www.getverixa.com").replace(/\/$/, "");

type Channel = "email" | "phone";
type Fail = { ok: false; error: string };

// ─── HELPERS ───────────────────────────────────────────────────────────────

function generateOTP(): string {
  return randomInt(100_000, 1_000_000).toString(); // CSPRNG, unlike Math.random
}

function normalizePhone(raw: string): string {
  const cleaned = raw.replace(/[^\d+]/g, "");
  // Compare on digits only, so "+1 (416) 555-0100" matches "4165550100" and "14165550100".
  const digits = cleaned.replace(/\D/g, "");
  return digits.length === 10 ? `1${digits}` : digits;
}

function normalizeLicense(licenseNumber: string): string {
  return String(licenseNumber ?? "").trim().toUpperCase();
}

const emailSchema = z.string().trim().toLowerCase().email().max(200);

async function loadProfile(licenseNumber: string) {
  return prisma.consultantProfile.findUnique({
    where: { licenseNumber },
    select: { id: true, rawEmail: true, rawPhone: true, fullName: true, userId: true, verificationLevel: true },
  });
}

/** Per-licence and per-recipient limits: stops using claim as an email/SMS cannon. */
async function checkOtpRateLimit(licenseNumber: string, channel: Channel, target: string): Promise<Fail | null> {
  const now = Date.now();
  const windowStart = new Date(now - OTP_LIMITS.windowMs);

  const existing = await prisma.claimOTP.findFirst({
    where: { licenseNumber, channel },
    orderBy: { createdAt: "desc" },
  });
  if (existing && existing.otpSentCount >= OTP_LIMITS.perLicensePerWindow && existing.lastOtpRequestAt && existing.lastOtpRequestAt > windowStart) {
    const minutesLeft = Math.ceil((existing.lastOtpRequestAt.getTime() + OTP_LIMITS.windowMs - now) / 60000);
    return { ok: false, error: `Too many codes requested. Please wait ${minutesLeft} minute(s) and try again.` };
  }

  const toTarget = await prisma.claimOTP.aggregate({
    where: { channel, target, lastOtpRequestAt: { gt: windowStart } },
    _sum: { otpSentCount: true },
  });
  if ((toTarget._sum.otpSentCount ?? 0) >= OTP_LIMITS.perTargetPerWindow) {
    return { ok: false, error: "Too many codes were sent to this address. Please wait 10 minutes and try again." };
  }
  return null;
}

async function storeOtp(licenseNumber: string, channel: Channel, target: string, isMatched: boolean) {
  const windowStart = new Date(Date.now() - OTP_LIMITS.windowMs);
  const existing = await prisma.claimOTP.findFirst({ where: { licenseNumber, channel }, orderBy: { createdAt: "desc" } });
  const inWindow = !!existing?.lastOtpRequestAt && existing.lastOtpRequestAt > windowStart;

  const otp = generateOTP();
  await prisma.$transaction([
    prisma.claimOTP.deleteMany({ where: { licenseNumber, channel } }),
    prisma.claimOTP.create({
      data: {
        licenseNumber,
        channel,
        target,
        codeHash: await bcrypt.hash(otp, 10),
        isMatched,
        expiresAt: new Date(Date.now() + OTP_LIMITS.ttlMs),
        otpSentCount: inWindow && existing ? existing.otpSentCount + 1 : 1,
        lastOtpRequestAt: new Date(),
      },
    }),
  ]);
  return otp;
}

async function verifyOtp(licenseNumber: string, channel: Channel, target: string, code: string) {
  const record = await prisma.claimOTP.findFirst({
    where: { licenseNumber, channel, target, verified: false },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return { ok: false as const, error: "No pending code found. Please request a new one." };
  if (new Date() > record.expiresAt) return { ok: false as const, error: "This code has expired. Please request a new one." };
  if (record.attempts >= OTP_LIMITS.maxAttempts) return { ok: false as const, error: "Too many attempts. Please request a new code." };

  // Count the attempt atomically before comparing, so parallel guesses can't exceed the cap.
  const bumped = await prisma.claimOTP.updateMany({
    where: { id: record.id, attempts: { lt: OTP_LIMITS.maxAttempts } },
    data: { attempts: { increment: 1 } },
  });
  if (bumped.count === 0) return { ok: false as const, error: "Too many attempts. Please request a new code." };

  const isValid = /^\d{6}$/.test(code.trim()) && (await bcrypt.compare(code.trim(), record.codeHash));
  if (!isValid) {
    const remaining = OTP_LIMITS.maxAttempts - (record.attempts + 1);
    return { ok: false as const, error: `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.` };
  }

  // verified + a fresh expiry: the claim must be completed within the hour.
  await prisma.claimOTP.update({
    where: { id: record.id },
    data: { verified: true, expiresAt: new Date(Date.now() + OTP_LIMITS.verifiedUseWithinMs) },
  });
  return { ok: true as const, isMatched: record.isMatched };
}

// ─── STEP 1: EMAIL OTP ──────────────────────────────────────────────────────
export async function initiateEmailOTP(licenseNumberRaw: string, emailRaw: string) {
  const licenseNumber = normalizeLicense(licenseNumberRaw);
  const parsedEmail = emailSchema.safeParse(emailRaw);
  if (!parsedEmail.success) return { ok: false, error: "Enter a valid email address." };
  const email = parsedEmail.data;

  const profile = await loadProfile(licenseNumber);
  if (!profile) return { ok: false, error: "Profile not found." };

  const limited = await checkOtpRateLimit(licenseNumber, "email", email);
  if (limited) return limited;

  const isMatched = !!profile.rawEmail && profile.rawEmail.trim().toLowerCase() === email;
  const otp = await storeOtp(licenseNumber, "email", email, isMatched);

  try {
    await resend.emails.send({
      from: "Verixa <claim@getverixa.com>",
      to: [email],
      subject: "Your Verixa verification code",
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
          <div style="background: #0F2A44; border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 24px;">
            <span style="color: #2FA4A9; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">VERIXA</span>
          </div>
          <h2 style="font-size: 22px; font-weight: 700; color: #1A1F2B; margin-bottom: 8px;">Claim your profile</h2>
          <p style="color: #6B7280; font-size: 15px; line-height: 1.6; margin-bottom: 32px;">
            Hi <strong>${escapeHtml(profile.fullName)}</strong>,<br/>
            Enter the code below to verify your identity and claim your Verixa consultant profile (licence ${escapeHtml(licenseNumber)}).
          </p>
          <div style="background: #F5F7FA; border: 2px dashed #2FA4A9; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <p style="font-size: 13px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px;">Verification code</p>
            <p style="font-size: 44px; font-weight: 900; color: #0F2A44; letter-spacing: 12px; margin: 0; font-family: monospace;">${otp}</p>
            <p style="font-size: 12px; color: #6B7280; margin: 12px 0 0;">Expires in 30 minutes</p>
          </div>
          <p style="color: #6B7280; font-size: 13px; text-align: center;">If you didn't request this, you can ignore this email.</p>
        </div>`,
    });
  } catch (err) {
    console.error("[initiateEmailOTP] send failed:", err);
    return { ok: false, error: "We couldn't send the email. Please try again." };
  }

  return { ok: true, isMatched, emailSentTo: email };
}

export async function verifyEmailOTP(licenseNumberRaw: string, emailRaw: string, code: string) {
  return verifyOtp(normalizeLicense(licenseNumberRaw), "email", String(emailRaw ?? "").trim().toLowerCase(), String(code ?? ""));
}

// ─── STEP 2 (optional): PHONE OTP ──────────────────────────────────────────
export async function initiatePhoneOTP(licenseNumberRaw: string, phone: string) {
  const licenseNumber = normalizeLicense(licenseNumberRaw);
  const normalizedInput = normalizePhone(String(phone ?? ""));
  if (normalizedInput.length < 10 || normalizedInput.length > 15) return { ok: false, error: "Enter a valid phone number with country code." };

  const profile = await loadProfile(licenseNumber);
  if (!profile) return { ok: false, error: "Profile not found." };

  const limited = await checkOtpRateLimit(licenseNumber, "phone", normalizedInput);
  if (limited) return limited;

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !fromPhone) {
    console.error("[initiatePhoneOTP] Twilio env vars missing");
    return { ok: false, error: "SMS verification is temporarily unavailable. You can skip this step." };
  }

  const isMatched = !!profile.rawPhone && normalizePhone(profile.rawPhone) === normalizedInput;
  const otp = await storeOtp(licenseNumber, "phone", normalizedInput, isMatched);

  try {
    const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: `+${normalizedInput}`, From: fromPhone, Body: `Your Verixa verification code is ${otp}. It expires in 30 minutes.` }),
    });
    if (!twilioRes.ok) {
      const errorData = await twilioRes.json().catch(() => ({}));
      console.error("[initiatePhoneOTP] Twilio error:", errorData);
      return { ok: false, error: "We couldn't send the SMS. Check the number or skip this step." };
    }
  } catch (err) {
    console.error("[initiatePhoneOTP] Twilio fetch failed:", err);
    return { ok: false, error: "We couldn't reach the SMS provider. Please try again or skip this step." };
  }

  return { ok: true, isMatched, smsSentTo: phone };
}

export async function verifyPhoneOTP(licenseNumberRaw: string, phone: string, code: string) {
  return verifyOtp(normalizeLicense(licenseNumberRaw), "phone", normalizePhone(String(phone ?? "")), String(code ?? ""));
}

// ─── STEP 3: COMPLETE CLAIM ────────────────────────────────────────────────
const passwordSchema = z.string().min(8, "Password must be at least 8 characters.").max(200);

export async function completeClaim(
  licenseNumberRaw: string,
  emailRaw: string,
  password: string
): Promise<{ ok: boolean; error?: string; userId?: string; verificationLevel?: string }> {
  const licenseNumber = normalizeLicense(licenseNumberRaw);
  const email = String(emailRaw ?? "").trim().toLowerCase();
  const pw = passwordSchema.safeParse(password);
  if (!pw.success) return { ok: false, error: pw.error.issues[0]?.message };

  const now = new Date();
  const emailOTP = await prisma.claimOTP.findFirst({
    where: { licenseNumber, channel: "email", target: email, verified: true, expiresAt: { gt: now } },
  });
  if (!emailOTP) return { ok: false, error: "Email verification expired or not completed. Please verify your email again." };

  const phoneOTP = await prisma.claimOTP.findFirst({
    where: { licenseNumber, channel: "phone", verified: true, expiresAt: { gt: now } },
  });

  const profile = await loadProfile(licenseNumber);
  if (!profile) return { ok: false, error: "Profile not found." };

  const verificationLevel = verificationLevelFor(emailOTP.isMatched, phoneOTP?.isMatched ?? false);

  const existingUser = await prisma.user.findUnique({ where: { email }, include: { consultantProfile: { select: { licenseNumber: true } } } });
  if (existingUser && !canClaimWithAccount(existingUser.role)) {
    return { ok: false, error: "This email belongs to an administrator account and can't be used to claim a profile." };
  }
  if (existingUser?.consultantProfile && existingUser.consultantProfile.licenseNumber !== licenseNumber) {
    return { ok: false, error: "This email is already linked to another consultant profile." };
  }

  const decision = decideClaim(
    { userId: profile.userId, verificationLevel: profile.verificationLevel },
    { userId: existingUser?.id ?? null, level: verificationLevel }
  );
  if (decision.action === "reject") return { ok: false, error: decision.error };

  const hashedPassword = await bcrypt.hash(pw.data, 12);
  let userId: string;

  try {
    userId = await prisma.$transaction(async (tx) => {
      const user = existingUser
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: { role: "CONSULTANT", hashedPassword, emailVerified: existingUser.emailVerified ?? now },
          })
        : await tx.user.create({
            data: { email, name: profile.fullName, role: "CONSULTANT", hashedPassword, emailVerified: now },
          });

      // Compare-and-set on the current owner so two simultaneous claims can't both win.
      const linked = await tx.consultantProfile.updateMany({
        where: { id: profile.id, userId: decision.action === "override" ? decision.previousUserId : profile.userId },
        data: { userId: user.id, verificationLevel },
      });
      if (linked.count === 0) throw new Error("CLAIM_RACE");

      if (!profile.userId) {
        // An old lazy-create path seeded "$150 / $300" consultation types and
        // Mon–Fri 9–5 hours on unclaimed profiles. They aren't the consultant's,
        // so a fresh claim starts with nothing live until they set their own.
        await tx.consultationType.updateMany({ where: { consultantProfileId: profile.id }, data: { isActive: false } });
        await tx.weeklyAvailability.updateMany({ where: { consultantProfileId: profile.id }, data: { isActive: false } });
      }
      if (decision.action === "override") {
        await tx.user.update({ where: { id: decision.previousUserId }, data: { role: "USER" } });
      }
      await tx.claimOTP.deleteMany({ where: { licenseNumber } });
      return user.id;
    });
  } catch (err) {
    if (err instanceof Error && err.message === "CLAIM_RACE") {
      return { ok: false, error: "This profile was just claimed. If this is your licence, contact support." };
    }
    console.error("[completeClaim] failed:", err);
    return { ok: false, error: "Something went wrong while claiming your profile. Please try again." };
  }

  await logEvent({
    userId,
    role: "CONSULTANT",
    action: decision.action === "override" ? "PROFILE_CLAIM_OVERRIDE" : "PROFILE_CLAIMED",
    details: { licenseNumber, verificationLevel, ...(decision.action === "override" ? { previousUserId: decision.previousUserId } : {}) },
  });

  try {
    const pending = verificationLevel === "PENDING_REVIEW";
    const verificationText =
      verificationLevel === "CICC_EMAIL_AND_PHONE"
        ? "Your email and phone number both match the CICC register."
        : verificationLevel === "CICC_EMAIL"
          ? "Your email matches the CICC register. You can add your register phone number later for an extra check."
          : verificationLevel === "CICC_PHONE"
            ? "Your phone number matches the CICC register."
            : "The contact details you used don't match the CICC register, so our team will review your claim. Online booking opens once it's approved.";

    await resend.emails.send({
      from: "Verixa <hi@getverixa.com>",
      to: [email],
      subject: pending ? "We received your Verixa profile claim" : "Your Verixa profile is claimed",
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; background: #F5F7FA;">
          <div style="background: #0F2A44; border-radius: 20px; padding: 32px; text-align: center; margin-bottom: 24px;">
            <span style="color: #2FA4A9; font-size: 28px; font-weight: 900; letter-spacing: -1px;">VERIXA</span>
          </div>
          <div style="background: white; border-radius: 20px; padding: 32px; margin-bottom: 16px;">
            <h1 style="font-size: 22px; font-weight: 800; color: #1A1F2B; margin: 0 0 12px;">Welcome, ${escapeHtml(profile.fullName)}</h1>
            <p style="color: #374151; font-size: 15px; line-height: 1.7; margin: 0 0 20px;">${verificationText}</p>
            <p style="color: #374151; font-size: 14px; line-height: 1.7; margin: 0 0 24px;">
              <strong>Next steps:</strong> add a professional photo and bio, list your consultation types and prices, and set your weekly availability.
            </p>
            <a href="${APP_URL}/dashboard" style="display: inline-block; background: #0F2A44; color: white; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-size: 15px;">Open your dashboard</a>
          </div>
          <p style="text-align: center; color: #6B7280; font-size: 12px;">RCIC licence ${escapeHtml(licenseNumber)}</p>
        </div>`,
    });
  } catch (emailErr) {
    console.warn("[completeClaim] welcome email failed:", emailErr);
  }

  return { ok: true, userId, verificationLevel };
}

// ─── Masked hints for the claim page ───────────────────────────────────────
export async function getCICCHint(licenseNumberRaw: string) {
  const profile = await loadProfile(normalizeLicense(licenseNumberRaw));
  if (!profile) return null;

  const maskEmail = (e: string) => {
    const [local, domain] = e.split("@");
    if (!local || !domain) return "***";
    return `${local[0]}${"*".repeat(Math.min(Math.max(local.length - 1, 1), 4))}@${domain}`;
  };
  const maskPhone = (p: string) => {
    const digits = p.replace(/\D/g, "");
    return digits.length >= 4 ? `***-***-${digits.slice(-4)}` : "***";
  };

  return {
    hasEmail: !!profile.rawEmail,
    maskedEmail: profile.rawEmail ? maskEmail(profile.rawEmail) : null,
    hasPhone: !!profile.rawPhone,
    maskedPhone: profile.rawPhone ? maskPhone(profile.rawPhone) : null,
    fullName: profile.fullName,
    isClaimed: !!profile.userId,
    claimIsPendingReview: !!profile.userId && profile.verificationLevel === "PENDING_REVIEW",
  };
}
