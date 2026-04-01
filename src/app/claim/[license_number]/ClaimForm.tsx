"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck, Mail, Phone, Lock, CheckCircle, XCircle,
  ArrowRight, Loader2, Eye, EyeOff, ChevronRight, Sparkles,
  AlertCircle, RefreshCw
} from "lucide-react";
import {
  initiateEmailOTP, verifyEmailOTP,
  initiatePhoneOTP, verifyPhoneOTP,
  completeClaim
} from "@/actions/claim.actions";
import { signIn } from "next-auth/react";

type Step = "email" | "email_otp" | "phone_offer" | "phone_otp" | "password" | "done";

interface Props {
  licenseNumber: string;
  fullName: string;
  ciccHint: {
    hasEmail: boolean;
    maskedEmail: string | null;
    hasPhone: boolean;
    maskedPhone: string | null;
  } | null;
}

export default function ClaimForm({ licenseNumber, fullName, ciccHint }: Props) {
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Email step
  const [email, setEmail] = useState("");
  const [emailOTP, setEmailOTP] = useState("");
  const [emailMatched, setEmailMatched] = useState(false);

  // Phone step
  const [phone, setPhone] = useState("");
  const [phoneOTP, setPhoneOTP] = useState("");
  const [phoneMatched, setPhoneMatched] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);

  // Password step
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  // Agreement checkboxes
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeDataSource, setAgreeDataSource] = useState(false);
  const allChecked = agreeTerms && agreePrivacy && agreeDataSource;

  // OTP resend cooldown
  const [resendCooldown, setResendCooldown] = useState(0);
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const clearMessages = () => { setError(""); setSuccess(""); };

  // ── STEP 1: Send email OTP ─────────────────────────────────────────────
  const handleSendEmailOTP = async () => {
    if (!email.includes("@")) { setError("Please enter a valid email."); return; }
    clearMessages(); setLoading(true);
    const res = await initiateEmailOTP(licenseNumber, email);
    setLoading(false);
    if (!res.ok) { setError(res.error!); return; }
    setEmailMatched(res.isMatched!);
    setStep("email_otp");
    setResendCooldown(60);
  };

  // ── STEP 2: Verify email OTP ───────────────────────────────────────────
  const handleVerifyEmailOTP = async () => {
    if (emailOTP.length !== 6) { setError("Please enter the 6-digit code."); return; }
    clearMessages(); setLoading(true);
    const res = await verifyEmailOTP(licenseNumber, email, emailOTP);
    setLoading(false);
    if (!res.ok) { setError(res.error!); return; }
    setEmailMatched(res.isMatched!);
    setStep("phone_offer");
  };

  // ── STEP 3a: Skip phone ────────────────────────────────────────────────
  const skipPhone = () => { setStep("password"); };

  // ── STEP 3b: Send phone OTP ────────────────────────────────────────────
  const handleSendPhoneOTP = async () => {
    if (phone.replace(/\D/g, "").length < 7) { setError("Please enter a valid phone number."); return; }
    clearMessages(); setLoading(true);
    const res = await initiatePhoneOTP(licenseNumber, phone);
    setLoading(false);
    if (!res.ok) { setError(res.error!); return; }
    setPhoneMatched(res.isMatched!);
    setStep("phone_otp");
    setResendCooldown(60);
  };

  // ── STEP 4: Verify phone OTP ───────────────────────────────────────────
  const handleVerifyPhoneOTP = async () => {
    if (phoneOTP.length !== 6) { setError("Please enter the 6-digit code."); return; }
    clearMessages(); setLoading(true);
    const res = await verifyPhoneOTP(licenseNumber, phone, phoneOTP);
    setLoading(false);
    if (!res.ok) { setError(res.error!); return; }
    setPhoneMatched(res.isMatched!);
    setPhoneVerified(true);
    setStep("password");
  };

  // ── STEP 5: Complete claim ─────────────────────────────────────────────
  const handleCompleteClaim = async () => {
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (!allChecked) { setError("Please accept all agreements before continuing."); return; }
    clearMessages(); setLoading(true);

    const res = await completeClaim(licenseNumber, email, password);
    if (!res.ok) { setLoading(false); setError(res.error!); return; }

    // Auto-sign in
    const signInRes = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);

    if (signInRes?.ok) {
      setStep("done");
      setTimeout(() => router.push("/dashboard/setup"), 1800);
    } else {
      setError("Account created but auto-login failed. Please sign in manually.");
    }
  };

  // ── BADGE for current verification level ──────────────────────────────
  const getVerificationBadge = () => {
    if (emailMatched && phoneVerified && phoneMatched) {
      return { label: "CICC Email + Phone Verified", color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: <ShieldCheck className="w-3.5 h-3.5" /> };
    }
    if (emailMatched) {
      return { label: "CICC Email Verified", color: "text-blue-700 bg-blue-50 border-blue-200", icon: <Mail className="w-3.5 h-3.5" /> };
    }
    return { label: "Pending Admin Review", color: "text-amber-700 bg-amber-50 border-amber-200", icon: <AlertCircle className="w-3.5 h-3.5" /> };
  };

  const badge = getVerificationBadge();

  // ── PROGRESS ──────────────────────────────────────────────────────────
  const stepIndex = { email: 1, email_otp: 1, phone_offer: 2, phone_otp: 2, password: 3, done: 4 };
  const progress = ((stepIndex[step] - 1) / 3) * 100;

  return (
    <div className="space-y-6">

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#2FA4A9] to-[#1d8a8f] rounded-full transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Status messages */}
      {error && (
        <div className="flex items-start gap-2.5 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm">
          <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2.5 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700 text-sm">
          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* ── STEP: EMAIL ─────────────────────────────────────────────────── */}
      {step === "email" && (
        <div className="space-y-5">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#2FA4A9]" /> Verify Your Email
            </h3>
            <p className="text-sm text-gray-500">
              Enter the email address associated with your CICC registration.
              We'll send a verification code to confirm your identity.
            </p>
          </div>

          {ciccHint?.hasEmail && (
            <div className="flex items-center gap-2 p-3 bg-[#2FA4A9]/5 border border-[#2FA4A9]/15 rounded-xl text-sm">
              <ShieldCheck className="w-4 h-4 text-[#2FA4A9] shrink-0" />
              <span className="text-gray-600">
                Your CICC-registered email ends with{" "}
                <strong className="text-gray-900 font-mono">{ciccHint.maskedEmail}</strong>
              </span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Work Email *</label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); clearMessages(); }}
              placeholder="name@yourpractice.com"
              className="w-full border border-gray-200 bg-white px-4 py-3.5 rounded-2xl text-sm text-gray-900 focus:outline-none focus:border-[#2FA4A9] focus:ring-4 focus:ring-[#2FA4A9]/5 transition"
              onKeyDown={e => e.key === "Enter" && handleSendEmailOTP()}
            />
          </div>

          <button
            onClick={handleSendEmailOTP}
            disabled={loading}
            className="w-full bg-[#0F2A44] hover:bg-black text-white font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Send Verification Code</span><ArrowRight className="w-4 h-4" /></>}
          </button>
        </div>
      )}

      {/* ── STEP: EMAIL OTP ─────────────────────────────────────────────── */}
      {step === "email_otp" && (
        <div className="space-y-5">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#2FA4A9]" /> Check Your Email
            </h3>
            <p className="text-sm text-gray-500">
              We sent a 6-digit code to <strong className="text-gray-700">{email}</strong>.
              Valid for 1 hour.
            </p>
          </div>

          {emailMatched && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-700">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>This email matches our CICC registry records <strong>✓</strong></span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-500">6-Digit Code</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={emailOTP}
              onChange={e => { setEmailOTP(e.target.value.replace(/\D/g, "")); clearMessages(); }}
              placeholder="000000"
              className="w-full border border-gray-200 bg-white px-4 py-3.5 rounded-2xl text-2xl font-mono text-center tracking-[0.5em] text-gray-900 focus:outline-none focus:border-[#2FA4A9] focus:ring-4 focus:ring-[#2FA4A9]/5 transition"
              onKeyDown={e => e.key === "Enter" && handleVerifyEmailOTP()}
            />
          </div>

          <button
            onClick={handleVerifyEmailOTP}
            disabled={loading}
            className="w-full bg-[#0F2A44] hover:bg-black text-white font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Verify Code</span><ArrowRight className="w-4 h-4" /></>}
          </button>

          <div className="flex items-center justify-between">
            <button onClick={() => { setStep("email"); clearMessages(); }} className="text-xs text-gray-400 hover:text-gray-600 transition">
              ← Change email
            </button>
            <button
              onClick={handleSendEmailOTP}
              disabled={resendCooldown > 0 || loading}
              className="text-xs text-[#2FA4A9] hover:underline disabled:text-gray-400 disabled:no-underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: PHONE OFFER ───────────────────────────────────────────── */}
      {step === "phone_offer" && (
        <div className="space-y-5">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Phone className="w-5 h-5 text-[#2FA4A9]" /> Add Phone Verification
            </h3>
            <p className="text-sm text-gray-500">
              Optionally verify your phone number to unlock an additional trust badge on your public profile.
            </p>
          </div>

          {ciccHint?.hasPhone && (
            <div className="flex items-center gap-2 p-3 bg-[#2FA4A9]/5 border border-[#2FA4A9]/15 rounded-xl text-sm">
              <ShieldCheck className="w-4 h-4 text-[#2FA4A9] shrink-0" />
              <span className="text-gray-600">
                Your CICC-registered phone: <strong className="font-mono text-gray-900">{ciccHint.maskedPhone}</strong>
              </span>
            </div>
          )}

          {/* What badges you unlock */}
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Trust Badges You'll Earn</p>
            <div className="space-y-2">
              <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl border ${emailMatched ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100"}`}>
                <Mail className="w-3.5 h-3.5" />
                {emailMatched ? "✓ CICC Email Verified" : "⚠ Email (Pending Review)"}
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl border bg-gray-100 text-gray-400 border-gray-200">
                <Phone className="w-3.5 h-3.5" />
                Phone Verified (verify now to unlock)
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={e => { setPhone(e.target.value); clearMessages(); }}
              placeholder="+1 (555) 000-0000"
              className="w-full border border-gray-200 bg-white px-4 py-3.5 rounded-2xl text-sm text-gray-900 focus:outline-none focus:border-[#2FA4A9] focus:ring-4 focus:ring-[#2FA4A9]/5 transition"
            />
          </div>

          <button
            onClick={handleSendPhoneOTP}
            disabled={loading}
            className="w-full bg-[#0F2A44] hover:bg-black text-white font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Send SMS Code</span><ArrowRight className="w-4 h-4" /></>}
          </button>

          <button onClick={skipPhone} className="w-full py-3 text-sm font-semibold text-gray-400 hover:text-gray-600 transition text-center">
            Skip — I'll add phone later
          </button>
        </div>
      )}

      {/* ── STEP: PHONE OTP ─────────────────────────────────────────────── */}
      {step === "phone_otp" && (
        <div className="space-y-5">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Phone className="w-5 h-5 text-[#2FA4A9]" /> Check Your SMS
            </h3>
            <p className="text-sm text-gray-500">
              Code sent to <strong className="text-gray-700">{phone}</strong>. Valid for 1 hour.
            </p>
          </div>

          {phoneMatched && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-700">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>This phone matches our CICC registry records <strong>✓</strong></span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-500">6-Digit Code</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={phoneOTP}
              onChange={e => { setPhoneOTP(e.target.value.replace(/\D/g, "")); clearMessages(); }}
              placeholder="000000"
              className="w-full border border-gray-200 bg-white px-4 py-3.5 rounded-2xl text-2xl font-mono text-center tracking-[0.5em] text-gray-900 focus:outline-none focus:border-[#2FA4A9] focus:ring-4 focus:ring-[#2FA4A9]/5 transition"
              onKeyDown={e => e.key === "Enter" && handleVerifyPhoneOTP()}
            />
          </div>

          <button
            onClick={handleVerifyPhoneOTP}
            disabled={loading}
            className="w-full bg-[#0F2A44] hover:bg-black text-white font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Verify Code</span><ArrowRight className="w-4 h-4" /></>}
          </button>

          <div className="flex items-center justify-between">
            <button onClick={() => { setStep("phone_offer"); clearMessages(); }} className="text-xs text-gray-400 hover:text-gray-600 transition">← Change number</button>
            <button onClick={() => { setStep("password"); clearMessages(); }} className="text-xs text-gray-400 hover:text-gray-600 transition">Skip phone →</button>
          </div>
        </div>
      )}

      {/* ── STEP: PASSWORD ──────────────────────────────────────────────── */}
      {step === "password" && (
        <div className="space-y-5">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#2FA4A9]" /> Create Your Password
            </h3>
            <p className="text-sm text-gray-500">
              Set a password for your Verixa account. You can always change this later.
            </p>
          </div>

          {/* Verification summary */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold ${badge.color}`}>
            {badge.icon} {badge.label}
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={e => { setPassword(e.target.value); clearMessages(); }}
                  placeholder="Min 8 characters"
                  className="w-full border border-gray-200 bg-white px-4 py-3.5 pr-12 rounded-2xl text-sm text-gray-900 focus:outline-none focus:border-[#2FA4A9] focus:ring-4 focus:ring-[#2FA4A9]/5 transition"
                />
                <button onClick={() => setShowPwd(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); clearMessages(); }}
                placeholder="Repeat password"
                className="w-full border border-gray-200 bg-white px-4 py-3.5 rounded-2xl text-sm text-gray-900 focus:outline-none focus:border-[#2FA4A9] focus:ring-4 focus:ring-[#2FA4A9]/5 transition"
                onKeyDown={e => e.key === "Enter" && handleCompleteClaim()}
              />
            </div>
          </div>

          {/* Password strength indicator */}
          {password.length > 0 && (
            <div className="space-y-1">
              <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${
                  password.length >= 12 ? "w-full bg-emerald-400"
                  : password.length >= 8  ? "w-2/3 bg-amber-400"
                  : "w-1/3 bg-red-400"
                }`} />
              </div>
              <p className={`text-xs ${password.length >= 8 ? "text-emerald-600" : "text-red-500"}`}>
                {password.length >= 12 ? "Strong password ✓" : password.length >= 8 ? "Good password" : "Too short (min 8)"}
              </p>
            </div>
          )}

          {/* Agreements */}
          <div className="space-y-3 p-4 bg-gray-50 border border-gray-100 rounded-2xl">
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-1">Required Agreements</p>
            {[
              {
                id: "terms",
                checked: agreeTerms,
                onChange: () => setAgreeTerms(v => !v),
                label: (
                  <>I agree to Verixa's <a href="/terms" target="_blank" className="text-[#2FA4A9] underline">Terms of Service</a> and all platform policies.</>
                ),
              },
              {
                id: "privacy",
                checked: agreePrivacy,
                onChange: () => setAgreePrivacy(v => !v),
                label: (
                  <>I have read and accept the <a href="/privacy" target="_blank" className="text-[#2FA4A9] underline">Privacy Policy</a> and consent to data processing.</>
                ),
              },
              {
                id: "datasource",
                checked: agreeDataSource,
                onChange: () => setAgreeDataSource(v => !v),
                label: (
                  <>I understand that my professional information was collected from the official <strong>CICC public registry</strong>. Verixa has not modified this data and only organized it for display purposes in compliance with applicable regulations.</>
                ),
              },
            ].map(({ id, checked, onChange, label }) => (
              <label key={id} className="flex items-start gap-3 cursor-pointer group">
                <div
                  onClick={onChange}
                  className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                    checked ? 'bg-[#2FA4A9] border-[#2FA4A9]' : 'border-gray-300 group-hover:border-[#2FA4A9]'
                  }`}
                >
                  {checked && (
                    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className="text-xs text-gray-600 leading-relaxed">{label}</span>
              </label>
            ))}
          </div>

          <button
            onClick={handleCompleteClaim}
            disabled={loading || !allChecked}
            className="w-full bg-[#2FA4A9] hover:bg-[#258d92] text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#2FA4A9]/20"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating Account...</>
              : <><Sparkles className="w-4 h-4" /> Claim &amp; Enter Dashboard</>
            }
          </button>
        </div>
      )}

      {/* ── STEP: DONE ──────────────────────────────────────────────────── */}
      {step === "done" && (
        <div className="text-center py-8 space-y-4">
          <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Profile Claimed!</h3>
          <p className="text-sm text-gray-500">Redirecting to your dashboard...</p>
          <Loader2 className="w-5 h-5 animate-spin text-[#2FA4A9] mx-auto" />
        </div>
      )}
    </div>
  );
}
