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
import Link from "next/link";
import { CheckCircle2, XCircle, MailX } from "lucide-react";
import { Suspense } from "react";

function UnsubscribeContent() {
  const params = useSearchParams();
  const status = params.get("status");

  const isSuccess = status === "success";
  const isInvalid = status === "invalid";

  const icon = isSuccess ? (
    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10 text-success">
      <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
    </span>
  ) : isInvalid ? (
    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-error/10 text-error">
      <XCircle className="h-7 w-7" aria-hidden="true" />
    </span>
  ) : (
    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mist text-navy">
      <MailX className="h-7 w-7" aria-hidden="true" />
    </span>
  );

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-mist px-6 py-16 font-sans text-ink">
      <Link href="/" className="mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/api/assets/logo?type=header" alt="Verixa" className="h-9 w-auto object-contain" />
      </Link>

      <div className="flex w-full max-w-md flex-col items-start gap-5 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        {icon}

        {isSuccess && (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-navy">You&apos;re unsubscribed</h1>
            <p className="text-sm leading-relaxed text-gray-600">
              Your email address has been removed from our mailing list. You won&apos;t receive further marketing
              emails from Verixa.
            </p>
            <p className="text-sm text-gray-600">
              Changed your mind?{" "}
              <a href="mailto:info@getverixa.ca" className="font-bold text-teal hover:text-navy">
                Contact us
              </a>{" "}
              to re-subscribe.
            </p>
          </>
        )}

        {isInvalid && (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-navy">This link didn&apos;t work</h1>
            <p className="text-sm leading-relaxed text-gray-600">
              The unsubscribe link is invalid or has expired. Use the link from the original email, or contact us
              directly.
            </p>
            <a
              href="mailto:info@getverixa.ca"
              className="inline-flex min-h-11 items-center rounded-xl bg-navy px-5 text-sm font-bold text-white transition-colors hover:bg-teal"
            >
              Contact support
            </a>
          </>
        )}

        {!status && (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-navy">Unsubscribe</h1>
            <p className="text-sm leading-relaxed text-gray-600">
              To unsubscribe, use the link at the bottom of the email you received.
            </p>
          </>
        )}

        <Link href="/" className="mt-2 border-t border-gray-200 pt-5 text-sm font-semibold text-gray-600 hover:text-navy">
          ← Back to Verixa
        </Link>
      </div>
    </main>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense>
      <UnsubscribeContent />
    </Suspense>
  );
}
