// ============================================================================
// Hardware Source: src/app/unsubscribe/page.tsx
// Route: /unsubscribe
// Version: 1.0.0 — 2026-04-08
// Why: Compliance route for opt-out handling and communication preference management.
// Domain: Public Application
// Env / Identity: React Client Component
// Owner: Verixa Web
// Notes: Keep route behavior deterministic and aligned with metadata, SEO, and access expectations.
// ============================================================================
"use client";
import { useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, ShieldOff } from "lucide-react";
import { Suspense } from "react";

function UnsubscribeContent() {
  const params = useSearchParams();
  const status = params.get("status");

  const isSuccess   = status === "success";
  const isInvalid   = status === "invalid";

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl border border-gray-100 shadow-xl p-10 text-center">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="bg-[#0F172A] px-6 py-3 rounded-2xl">
            <span className="text-[#2FA4A9] font-black text-xl tracking-tight">VERIXA</span>
          </div>
        </div>

        {isSuccess && (
          <>
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">You're unsubscribed</h1>
            <p className="text-gray-500 text-sm leading-relaxed mb-8">
              Your email address has been removed from our mailing list.
              You won't receive any further marketing emails from Verixa.
            </p>
            <p className="text-xs text-gray-400">
              Changed your mind?{" "}
              <a href="mailto:info@getverixa.ca" className="text-[#2FA4A9] font-semibold underline">
                Contact us
              </a>{" "}
              to re-subscribe.
            </p>
          </>
        )}

        {isInvalid && (
          <>
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Invalid link</h1>
            <p className="text-gray-500 text-sm leading-relaxed mb-8">
              This unsubscribe link is invalid or has expired.
              Please use the link from the original email, or contact us directly.
            </p>
            <a
              href="mailto:info@getverixa.ca"
              className="inline-block bg-[#2FA4A9] text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-[#2FA4A9]/90 transition"
            >
              Contact Support
            </a>
          </>
        )}

        {!status && (
          <>
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldOff className="w-8 h-8 text-gray-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Unsubscribe</h1>
            <p className="text-gray-500 text-sm">
              To unsubscribe, please use the link at the bottom of the email you received.
            </p>
          </>
        )}

        <div className="mt-10 pt-6 border-t border-gray-100">
          <a href="/" className="text-xs text-gray-400 hover:text-gray-600 transition">
            ← Return to Verixa
          </a>
        </div>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense>
      <UnsubscribeContent />
    </Suspense>
  );
}
