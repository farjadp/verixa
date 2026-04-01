// ============================================================================
// Route: /reset-password/[token]
// ============================================================================

"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { resetPassword, verifyResetToken } from "@/actions/password-reset.actions";
import { ArrowRight, Loader2, CheckCircle2, AlertTriangle, Eye, EyeOff } from "lucide-react";

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [tokenStatus, setTokenStatus] = useState<"checking" | "valid" | "invalid">("checking");
  const [invalidReason, setInvalidReason] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState("");

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setTokenStatus("invalid");
      setInvalidReason("No reset token found.");
      return;
    }
    verifyResetToken(token).then((res) => {
      if (res.valid) {
        setTokenStatus("valid");
      } else {
        setTokenStatus("invalid");
        setInvalidReason(res.reason || "Invalid link.");
      }
    });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setStatus("loading");
    try {
      await resetPassword(token, newPassword);
      setStatus("done");
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
      setStatus("idle");
    }
  };

  const strength = (() => {
    if (newPassword.length === 0) return null;
    if (newPassword.length < 8) return { label: "Too short", color: "#EF4444", width: "25%" };
    if (/(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])/.test(newPassword))
      return { label: "Strong", color: "#22C55E", width: "100%" };
    if (/(?=.*[A-Z])|(?=.*[0-9])/.test(newPassword))
      return { label: "Good", color: "#F59E0B", width: "65%" };
    return { label: "Weak", color: "#EF4444", width: "35%" };
  })();

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 font-sans overflow-hidden">
      {/* LEFT: Form */}
      <div className="flex flex-col justify-center px-8 sm:px-16 md:px-24 bg-white">
        <div className="max-w-md w-full mx-auto">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 mb-16 group w-fit">
            <img src="/Brand/Vertixa.png" alt="Verixa Logo" className="h-8 w-auto object-contain rounded-sm" />
            <span className="text-xl font-bold tracking-tighter uppercase font-serif text-[#1A1F2B]">Verixa</span>
          </Link>

          {/* Checking Token */}
          {tokenStatus === "checking" && (
            <div className="flex flex-col items-center gap-4 py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#2FA4A9]" />
              <p className="text-gray-500">Verifying your link…</p>
            </div>
          )}

          {/* Invalid Token */}
          {tokenStatus === "invalid" && (
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
              </div>
              <h1 className="text-3xl font-bold font-serif text-[#1A1F2B] mb-3">Link Expired</h1>
              <p className="text-gray-500 mb-8">{invalidReason}</p>
              <Link
                href="/forgot-password"
                className="inline-flex items-center gap-2 bg-[#0F2A44] text-white font-bold px-6 py-3 rounded-xl hover:bg-black transition-colors"
              >
                Request a new link <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* Success */}
          {tokenStatus === "valid" && status === "done" && (
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-[#2FA4A9]/10 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-[#2FA4A9]" />
                </div>
              </div>
              <h1 className="text-3xl font-bold font-serif text-[#1A1F2B] mb-3">Password updated!</h1>
              <p className="text-gray-500 mb-8">
                Your password has been changed successfully. You can now sign in with your new password.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-[#0F2A44] text-white font-bold px-6 py-3 rounded-xl hover:bg-black transition-colors group"
              >
                Sign In <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          )}

          {/* Reset Form */}
          {tokenStatus === "valid" && status !== "done" && (
            <>
              <div className="mb-10">
                <h1 className="text-3xl md:text-4xl font-bold font-serif text-[#1A1F2B] mb-3">
                  Set a new password
                </h1>
                <p className="text-gray-500">Choose something strong and unique.</p>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                {error && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold">{error}</div>
                )}

                {/* New password */}
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700" htmlFor="newPassword">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      type={showNew ? "text" : "password"}
                      id="newPassword"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      required
                      className="w-full bg-white border border-gray-200 px-4 py-3.5 pr-12 rounded-xl focus:border-[#2FA4A9] focus:ring-1 focus:ring-[#2FA4A9] focus:outline-none transition-colors shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((p) => !p)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#2FA4A9] transition-colors"
                      aria-label={showNew ? "Hide password" : "Show password"}
                    >
                      {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {/* Strength indicator */}
                  {strength && (
                    <div className="mt-2">
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: strength.width, backgroundColor: strength.color }}
                        />
                      </div>
                      <p className="text-xs mt-1 font-medium" style={{ color: strength.color }}>
                        {strength.label}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700" htmlFor="confirmPassword">
                    Confirm new password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your password"
                      required
                      className="w-full bg-white border border-gray-200 px-4 py-3.5 pr-12 rounded-xl focus:border-[#2FA4A9] focus:ring-1 focus:ring-[#2FA4A9] focus:outline-none transition-colors shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((p) => !p)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#2FA4A9] transition-colors"
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                    >
                      {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {confirmPassword && (
                    <p
                      className="text-xs mt-1 font-medium"
                      style={{ color: confirmPassword === newPassword ? "#22C55E" : "#EF4444" }}
                    >
                      {confirmPassword === newPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full bg-[#0F2A44] text-white py-4 rounded-xl font-bold text-lg hover:bg-black transition-colors shadow-lg shadow-black/10 mt-4 flex items-center justify-center gap-2 group disabled:opacity-70"
                >
                  {status === "loading" ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Update Password
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* RIGHT: Branding */}
      <div className="hidden lg:flex relative bg-[#0A192F] items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0A192F] to-transparent" />
        <div className="relative z-10 max-w-lg text-white text-center">
          <div className="w-20 h-20 rounded-full bg-[#2FA4A9]/20 border border-[#2FA4A9]/30 flex items-center justify-center mx-auto mb-8">
            <svg className="w-10 h-10 text-[#2FA4A9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <h2 className="text-3xl font-serif font-bold leading-tight mb-4">Secure by Design</h2>
          <p className="text-gray-400 text-lg leading-relaxed">
            This link is single-use and expires in one hour. Your account security is our top priority.
          </p>
        </div>
      </div>
    </div>
  );
}
