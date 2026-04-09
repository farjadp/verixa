// ============================================================================
// Hardware Source: src/app/forgot-password/page.tsx
// Route: /forgot-password
// Version: 1.0.0 — 2026-04-08
// Why: Authentication route handling sign-in, registration, and credential recovery flows.
// Domain: Authentication & Access
// Env / Identity: React Client Component
// Owner: Verixa Web
// Notes: User-input and token handling path; validate payloads strictly and keep error responses non-sensitive.
// ============================================================================
"use client";

import Link from "next/link";
import { useState } from "react";
import { requestPasswordReset } from "@/actions/password-reset.actions";
import { ArrowRight, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStatus("loading");
    try {
      await requestPasswordReset(email);
      setStatus("done");
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
      setStatus("idle");
    }
  };

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

          {status === "done" ? (
            /* ── Success state ── */
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-[#2FA4A9]/10 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-[#2FA4A9]" />
                </div>
              </div>
              <h1 className="text-3xl font-bold font-serif text-[#1A1F2B] mb-3">Check your inbox</h1>
              <p className="text-gray-500 mb-8">
                If an account exists for <span className="font-semibold text-[#1A1F2B]">{email}</span>, you'll
                receive a password reset link shortly.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-[#2FA4A9] font-bold hover:underline"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Sign In
              </Link>
            </div>
          ) : (
            /* ── Email form ── */
            <>
              <div className="mb-10">
                <h1 className="text-3xl md:text-4xl font-bold font-serif text-[#1A1F2B] mb-3">
                  Forgot your password?
                </h1>
                <p className="text-gray-500">
                  Enter your email and we&apos;ll send you a link to reset it.
                </p>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                {error && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold">{error}</div>
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700" htmlFor="email">
                    Email address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full bg-white border border-gray-200 px-4 py-3.5 rounded-xl focus:border-[#2FA4A9] focus:ring-1 focus:ring-[#2FA4A9] focus:outline-none transition-colors shadow-sm"
                  />
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
                      Send Reset Link
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-gray-500 mt-10">
                Remembered it?{" "}
                <Link href="/login" className="text-[#2FA4A9] font-bold hover:underline">
                  Sign in
                </Link>
              </p>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
          </div>
          <h2 className="text-3xl font-serif font-bold leading-tight mb-4">Account Security First</h2>
          <p className="text-gray-400 text-lg leading-relaxed">
            Your reset link is valid for one hour and can only be used once. Keep your account safe.
          </p>
        </div>
      </div>
    </div>
  );
}
