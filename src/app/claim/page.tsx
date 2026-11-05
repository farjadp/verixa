// ============================================================================
// Route: /claim
// Why: Entry point linked from the homepage and footer (it returned 404).
//      A consultant enters their CICC licence number and continues to the
//      OTP claim flow at /claim/[license_number].
// ============================================================================
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Claim your consultant profile",
  description: "Licensed RCICs can claim their Verixa profile using the contact details on the CICC register.",
};

const LICENCE_RE = /^[A-Z]{1,4}\d{3,8}$/;

export default async function ClaimLandingPage({ searchParams }: { searchParams: Promise<{ licence?: string }> }) {
  const { licence } = await searchParams;
  const value = (licence ?? "").trim().toUpperCase().replace(/\s+/g, "");
  let notFoundMessage: string | null = null;

  if (value) {
    if (!LICENCE_RE.test(value)) {
      notFoundMessage = "That doesn't look like a CICC licence number (for example R123456).";
    } else {
      const profile = await prisma.consultantProfile.findUnique({ where: { licenseNumber: value }, select: { licenseNumber: true } });
      if (profile) redirect(`/claim/${profile.licenseNumber}`);
      notFoundMessage = `We couldn't find licence ${value} on the CICC register data we hold. Check the number, or search by name.`;
    }
  }

  return (
    <div className="min-h-screen bg-mist pt-[80px] font-sans text-ink lg:pt-[88px]">
      <Header />
      <main className="mx-auto max-w-xl px-4 py-14">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal/10 text-teal">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-navy">Claim your profile</h1>
          <p className="text-sm text-gray-600">
            Every licensed RCIC already has a Verixa profile built from the public CICC register. Claim yours with the email or
            phone number listed for you on the register, then add your photo, services and availability.
          </p>
        </div>

        <form method="get" className="rounded-3xl border border-gray-200 bg-white p-6">
          <label htmlFor="licence" className="mb-1.5 block text-sm font-semibold text-ink">CICC licence number</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="licence"
              name="licence"
              required
              defaultValue={value}
              placeholder="R123456"
              autoComplete="off"
              className="flex-1 rounded-xl border border-gray-200 px-4 py-3 font-mono text-sm uppercase outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
              aria-describedby={notFoundMessage ? "licence-error" : undefined}
            />
            <button type="submit" className="rounded-xl bg-navy px-6 py-3 text-sm font-bold text-white hover:bg-ink">Continue</button>
          </div>
          {notFoundMessage && (
            <p id="licence-error" role="alert" className="mt-3 text-sm text-error">{notFoundMessage}</p>
          )}
          <p className="mt-4 text-xs text-gray-500">
            Don&apos;t know your number? <Link href="/search" className="font-semibold text-teal hover:underline">Search by name</Link> and use
            &ldquo;Claim profile&rdquo; on your page.
          </p>
        </form>
      </main>
      <Footer />
    </div>
  );
}
