"use server";

import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import bcrypt from "bcryptjs";
import twilio from "twilio";
import { signIn } from "next-auth/react";
import { getConsultantByLicense } from "@/lib/db";

const resend = new Resend(process.env.RESEND_API_KEY!);
const twilioClient = 
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

// ─── RATE LIMIT CONSTANTS (Issue 15a) ────────────────────────────────────────
const OTP_RATE_LIMIT = 3;           // max OTPs per window
const OTP_WINDOW_MS = 10 * 60 * 1000; // 10-minute sliding window

// ─── HELPERS ───────────────────────────────────────────────────────────────
function generateOTP(): string {
  return Math.floor(100_000 + Math.random() * 900_000).toString();
}

function normalizePhone(raw: string): string {
  // Strip everything except digits and leading +
  return raw.replace(/[^\d+]/g, "");
}

async function ensureConsultantProfile(licenseNumber: string) {
  let profile = await prisma.consultantProfile.findUnique({
    where: { licenseNumber },
    select: { rawEmail: true, rawPhone: true, fullName: true },
  });
  
  if (profile) return profile;

  // Lazily create profile if from CICC registry
  const ciccData = getConsultantByLicense(licenseNumber);
  if (!ciccData) return null;

  profile = await prisma.consultantProfile.create({
    data: {
      licenseNumber: ciccData.License_Number,
      fullName: ciccData.Full_Name,
      slug: ciccData.License_Number.toLowerCase(),
      status: ciccData.Status,
      company: ciccData.Company,
      province: ciccData.Province,
      country: ciccData.Country,
      rawEmail: ciccData.Email,
      rawPhone: ciccData.Phone,
    },
    select: { rawEmail: true, rawPhone: true, fullName: true },
  });
  
  return profile;
}

// ─── STEP 1: INITIATE EMAIL OTP ────────────────────────────────────────────
export async function initiateEmailOTP(licenseNumber: string, email: string) {
  const profile = await ensureConsultantProfile(licenseNumber);

  if (!profile) return { ok: false, error: "Profile not found." };

  // ── Issue 15a: DB-based rate limit ──────────────────────────────────────────
  // We look at the existing OTP record for this license+channel to check timing.
  // Using the ClaimOTP record itself avoids a separate table.
  const now = new Date();
  const windowStart = new Date(now.getTime() - OTP_WINDOW_MS);

  const existing = await prisma.claimOTP.findFirst({
    where: { licenseNumber, channel: "email" },
    orderBy: { createdAt: "desc" },
  });

  if (existing && existing.otpSentCount >= OTP_RATE_LIMIT) {
    const windowResetAt = existing.lastOtpRequestAt
      ? new Date(existing.lastOtpRequestAt.getTime() + OTP_WINDOW_MS)
      : null;
    if (windowResetAt && windowResetAt > now) {
      const minutesLeft = Math.ceil((windowResetAt.getTime() - now.getTime()) / 60000);
      return { ok: false, error: `Too many OTP requests. Please wait ${minutesLeft} minute(s) before trying again.` };
    }
  }
  // ────────────────────────────────────────────────────────────────────────────

  // Check match (case-insensitive)
  const isMatched = !!(
    profile.rawEmail &&
    profile.rawEmail.toLowerCase() === email.toLowerCase()
  );

  const otp = generateOTP();
  const codeHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Determine new sent count — reset if outside window
  const isInWindow = existing?.lastOtpRequestAt && existing.lastOtpRequestAt > windowStart;
  const newSentCount = isInWindow ? (existing!.otpSentCount + 1) : 1;

  // Invalidate old OTPs for this license+channel and create new one with updated counter
  await prisma.claimOTP.deleteMany({
    where: { licenseNumber, channel: "email" },
  });

  await prisma.claimOTP.create({
    data: {
      licenseNumber,
      channel: "email",
      target: email.toLowerCase(),
      codeHash,
      isMatched,
      expiresAt,
      otpSentCount: newSentCount,
      lastOtpRequestAt: now,
    },
  });

  // Send email via Resend
  try {
    await resend.emails.send({
        from: "Verixa <claim@getverixa.com>",
      to: [email],
      subject: "Your Verixa Claim Verification Code",
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
          <div style="background: #0F2A44; border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 24px;">
            <span style="color: #2FA4A9; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">VERIXA</span>
          </div>
          <h2 style="font-size: 22px; font-weight: 700; color: #1A1F2B; margin-bottom: 8px;">Claim Your Profile</h2>
          <p style="color: #6B7280; font-size: 15px; line-height: 1.6; margin-bottom: 32px;">
            Hi <strong>${profile.fullName}</strong>,<br/>
            Enter the code below to verify your identity and claim your Verixa consultant profile.
          </p>
          <div style="background: #F8FAFC; border: 2px dashed #2FA4A9; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <p style="font-size: 13px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px;">Verification Code</p>
            <p style="font-size: 48px; font-weight: 900; color: #0F2A44; letter-spacing: 12px; margin: 0; font-family: monospace;">${otp}</p>
            <p style="font-size: 12px; color: #9CA3AF; margin: 12px 0 0;">Expires in 1 hour</p>
          </div>
          <p style="color: #9CA3AF; font-size: 13px; text-align: center;">If you did not request this, you can safely ignore this email.</p>
        </div>
      `,
    });
  } catch (err: any) {
    return { ok: false, error: "Failed to send email. Please try again." };
  }

  return { ok: true, isMatched, emailSentTo: email };
}

// ─── STEP 2: VERIFY EMAIL OTP ──────────────────────────────────────────────
export async function verifyEmailOTP(licenseNumber: string, email: string, code: string) {
  const record = await prisma.claimOTP.findFirst({
    where: {
      licenseNumber,
      channel: "email",
      target: email.toLowerCase(),
      verified: false,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) return { ok: false, error: "No pending verification found. Please request a new code." };
  if (new Date() > record.expiresAt) return { ok: false, error: "Code has expired. Please request a new one." };
  if (record.attempts >= 5) return { ok: false, error: "Too many attempts. Please request a new code." };

  // Increment attempts
  await prisma.claimOTP.update({
    where: { id: record.id },
    data: { attempts: { increment: 1 } },
  });

  const isValid = await bcrypt.compare(code.trim(), record.codeHash);
  if (!isValid) {
    const remaining = 5 - (record.attempts + 1);
    return { ok: false, error: `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.` };
  }

  // Mark as verified
  await prisma.claimOTP.update({
    where: { id: record.id },
    data: { verified: true },
  });

  return { ok: true, isMatched: record.isMatched };
}

// ─── STEP 3: INITIATE PHONE OTP ────────────────────────────────────────────
export async function initiatePhoneOTP(licenseNumber: string, phone: string) {
  const profile = await ensureConsultantProfile(licenseNumber);

  if (!profile) return { ok: false, error: "Profile not found." };

  // ── Issue 15a: DB-based rate limit (same logic as email) ────────────────────
  const now = new Date();
  const windowStart = new Date(now.getTime() - OTP_WINDOW_MS);

  const existingPhone = await prisma.claimOTP.findFirst({
    where: { licenseNumber, channel: "phone" },
    orderBy: { createdAt: "desc" },
  });

  if (existingPhone && existingPhone.otpSentCount >= OTP_RATE_LIMIT) {
    const windowResetAt = existingPhone.lastOtpRequestAt
      ? new Date(existingPhone.lastOtpRequestAt.getTime() + OTP_WINDOW_MS)
      : null;
    if (windowResetAt && windowResetAt > now) {
      const minutesLeft = Math.ceil((windowResetAt.getTime() - now.getTime()) / 60000);
      return { ok: false, error: `Too many OTP requests. Please wait ${minutesLeft} minute(s) before trying again.` };
    }
  }
  // ────────────────────────────────────────────────────────────────────────────

  const normalizedInput = normalizePhone(phone);
  const normalizedDB = profile.rawPhone ? normalizePhone(profile.rawPhone) : null;
  const isMatched = !!(normalizedDB && normalizedDB === normalizedInput);

  const otp = generateOTP();
  const codeHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  const isInWindow = existingPhone?.lastOtpRequestAt && existingPhone.lastOtpRequestAt > windowStart;
  const newSentCount = isInWindow ? (existingPhone!.otpSentCount + 1) : 1;

  await prisma.claimOTP.deleteMany({
    where: { licenseNumber, channel: "phone" },
  });

  await prisma.claimOTP.create({
    data: {
      licenseNumber,
      channel: "phone",
      target: normalizedInput,
      codeHash,
      isMatched,
      expiresAt,
      otpSentCount: newSentCount,
      lastOtpRequestAt: now,
    },
  });

  try {
    if (twilioClient) {
      await twilioClient.messages.create({
        body: `Your Verixa verification code is: ${otp}. Valid for 1 hour.`,
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: normalizedInput.startsWith("+") ? normalizedInput : `+${normalizedInput}`,
      });
    } else {
      console.log(`[MOCK SMS] To: ${normalizedInput}, Body: Your Verixa verification code is: ${otp}. Valid for 1 hour.`);
    }
  } catch (err: any) {
    console.error("Twilio SMS Error:", err);
    return { ok: false, error: `Failed to send SMS. Reason: ${err?.message || 'Unknown error'}` };
  }

  return { ok: true, isMatched, smsSentTo: phone };
}

// ─── STEP 4: VERIFY PHONE OTP ──────────────────────────────────────────────
export async function verifyPhoneOTP(licenseNumber: string, phone: string, code: string) {
  const normalized = normalizePhone(phone);
  const record = await prisma.claimOTP.findFirst({
    where: {
      licenseNumber,
      channel: "phone",
      target: normalized,
      verified: false,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) return { ok: false, error: "No pending SMS verification found." };
  if (new Date() > record.expiresAt) return { ok: false, error: "Code has expired." };
  if (record.attempts >= 5) return { ok: false, error: "Too many attempts. Request a new code." };

  await prisma.claimOTP.update({
    where: { id: record.id },
    data: { attempts: { increment: 1 } },
  });

  const isValid = await bcrypt.compare(code.trim(), record.codeHash);
  if (!isValid) {
    const remaining = 5 - (record.attempts + 1);
    return { ok: false, error: `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.` };
  }

  await prisma.claimOTP.update({
    where: { id: record.id },
    data: { verified: true },
  });

  return { ok: true, isMatched: record.isMatched };
}

// ─── STEP 5: COMPLETE CLAIM (Create account + link profile) ────────────────
export async function completeClaim(
  licenseNumber: string,
  email: string,
  password: string
): Promise<{ ok: boolean; error?: string; userId?: string }> {
  // Double-check email OTP was verified
  const emailOTP = await prisma.claimOTP.findFirst({
    where: { licenseNumber, channel: "email", target: email.toLowerCase(), verified: true },
  });
  if (!emailOTP) return { ok: false, error: "Email verification not completed." };

  // Check profile exists and isn't already claimed
  const profile = await prisma.consultantProfile.findUnique({
    where: { licenseNumber },
    select: { id: true, userId: true, fullName: true },
  });
  if (!profile) return { ok: false, error: "Profile not found." };
  if (profile.userId) return { ok: false, error: "This profile has already been claimed." };

  // Check for verified phone OTP
  const phoneOTP = await prisma.claimOTP.findFirst({
    where: { licenseNumber, channel: "phone", verified: true },
  });

  // Determine verification level
  const emailMatched = emailOTP.isMatched;
  const phoneMatched = phoneOTP?.isMatched ?? false;

  const verificationLevel =
    emailMatched && phoneMatched
      ? "CICC_EMAIL_AND_PHONE"
      : emailMatched
      ? "CICC_EMAIL"
      : phoneMatched
      ? "CICC_PHONE"
      : "PENDING_REVIEW";

  const hashedPassword = await bcrypt.hash(password, 12);

  try {
    // Check if a user with this email already exists
    const existingUser = await prisma.user.findUnique({ 
      where: { email: email.toLowerCase() },
      include: { consultantProfile: true }
    });

    if (existingUser && existingUser.consultantProfile && existingUser.consultantProfile.licenseNumber !== licenseNumber) {
      // Trying to claim another profile with the same email
      return { ok: false, error: "This email is already linked to another consultant profile." };
    }

    let userId: string;

    if (existingUser) {
      // Update existing user
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          role: "CONSULTANT",
          hashedPassword,
          emailVerified: new Date(),
        },
      });
      userId = existingUser.id;
    } else {
      // Create new user
      const newUser = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          name: profile.fullName,
          role: "CONSULTANT",
          hashedPassword,
          emailVerified: new Date(),
        },
      });
      userId = newUser.id;
    }

    // Link profile → user and store verification level
    await prisma.consultantProfile.update({
      where: { licenseNumber },
      data: {
        userId,
        verificationLevel,
      },
    });

    // Send welcome email
    try {
      const verificationText =
        verificationLevel === "CICC_EMAIL_AND_PHONE"
          ? "Your email and phone number were both matched against the CICC official registry — you have achieved the highest trust level on Verixa."
          : verificationLevel === "CICC_EMAIL"
          ? "Your email was matched against the CICC official registry. You can further boost your trust score by verifying your phone number from your dashboard."
          : "Your account is under admin review. We will notify you once your identity is confirmed.";

      await resend.emails.send({
          from: "Verixa <hi@getverixa.com>",
        to: [email.toLowerCase()],
        subject: "Welcome to Verixa — Your Profile is Now Active 🎉",
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; background: #F4F6F9;">
            <div style="background: #0F2A44; border-radius: 20px; padding: 32px; text-align: center; margin-bottom: 24px;">
              <span style="color: #2FA4A9; font-size: 28px; font-weight: 900; letter-spacing: -1px;">VERIXA</span>
              <p style="color: rgba(255,255,255,0.5); font-size: 12px; margin: 6px 0 0; letter-spacing: 3px; text-transform: uppercase;">Canada's Trusted Immigration Network</p>
            </div>

            <div style="background: white; border-radius: 20px; padding: 32px; margin-bottom: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.04);">
              <h1 style="font-size: 24px; font-weight: 800; color: #0F172A; margin: 0 0 8px;">Welcome, ${profile.fullName}! 🎉</h1>
              <p style="color: #6B7280; font-size: 15px; line-height: 1.7; margin: 0 0 20px;">
                Your Verixa consultant profile is now <strong style="color: #0F172A;">live and active</strong>. Clients can now find you, view your credentials, and request consultations.
              </p>

              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                <p style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #15803d; margin: 0 0 6px;">✓ Identity Verification Status</p>
                <p style="font-size: 14px; color: #166534; margin: 0; line-height: 1.6;">${verificationText}</p>
              </div>

              <p style="color: #6B7280; font-size: 14px; line-height: 1.7; margin: 0 0 24px;">
                <strong style="color: #0F172A;">Next Steps:</strong><br/>
                ✦ Add a professional headshot<br/>
                ✦ Write your bio and areas of practice<br/>
                ✦ Enable your booking system to start receiving clients<br/>
                ✦ Add your availability schedule
              </p>

              <a href="https://getverixa.ca/dashboard/setup" style="display: inline-block; background: #0F2A44; color: white; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-size: 15px;">
                Complete Your Profile →
              </a>
            </div>

            <p style="text-align: center; color: #9CA3AF; font-size: 12px;">
              Verixa Network · <a href="https://getverixa.ca" style="color: #2FA4A9;">getverixa.ca</a><br/>
              Your RCIC License: <strong>${licenseNumber}</strong>
            </p>
          </div>
        `,
      });
    } catch (emailErr) {
      // Don't fail the claim if welcome email fails
      console.warn("[completeClaim] Welcome email failed:", emailErr);
    }

    // Cleanup OTP records
    await prisma.claimOTP.deleteMany({ where: { licenseNumber } });

    return { ok: true, userId };
  } catch (err: any) {
    console.error("[completeClaim error]", err);
    return { ok: false, error: `Something went wrong: ${err?.message || 'Unknown error'}` };
  }
}

// ─── GET CICC PHONE (for showing hint in UI) ──────────────────────────────
export async function getCICCHint(licenseNumber: string) {
  const profile = await ensureConsultantProfile(licenseNumber);
  if (!profile) return null;

  // Mask email: a****@domain.com
  const maskEmail = (e: string) => {
    const [local, domain] = e.split("@");
    return `${local[0]}${"*".repeat(Math.min(local.length - 1, 4))}@${domain}`;
  };

  // Mask phone: +1 (***) ***-1234
  const maskPhone = (p: string) => {
    const digits = p.replace(/\D/g, "");
    return `+${digits[0]} (***) ***-${digits.slice(-4)}`;
  };

  return {
    hasEmail: !!profile.rawEmail,
    maskedEmail: profile.rawEmail ? maskEmail(profile.rawEmail) : null,
    hasPhone: !!profile.rawPhone,
    maskedPhone: profile.rawPhone ? maskPhone(profile.rawPhone) : null,
    fullName: profile.fullName,
  };
}
