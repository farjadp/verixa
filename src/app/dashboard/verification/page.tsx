// ============================================================================
// Route: /dashboard/verification
// Why: Shows the consultant's real verification status and the one working
//      way to raise it (re-run the claim with the CICC-register email/phone).
//      The old page had an email box and an upload area wired to nothing.
// ============================================================================
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { BadgeCheck, CheckCircle2, Circle, Mail, Phone, ShieldCheck } from "lucide-react";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { isRegistryActive } from "@/lib/booking-rules";
import { describeVerification } from "@/lib/verification";

export default async function VerificationPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard/verification");
  if (session.user.role !== "CONSULTANT") redirect("/dashboard");

  const profile = await prisma.consultantProfile.findUnique({
    where: { userId: session.user.id },
    select: { licenseNumber: true, status: true, verificationLevel: true, rawEmail: true, rawPhone: true },
  });
  if (!profile) redirect("/dashboard");

  const trust = describeVerification(true, profile.verificationLevel);
  const active = isRegistryActive(profile.status);
  const steps = [
    { icon: ShieldCheck, label: "Licence active on the CICC register", done: active, note: active ? `Licence ${profile.licenseNumber}` : `Register status: ${profile.status}` },
    { icon: Mail, label: "Email matches the CICC register", done: trust.emailMatched, note: profile.rawEmail ? "Verify with the email listed on your register entry." : "The register has no email for you." },
    { icon: Phone, label: "Phone matches the CICC register", done: trust.phoneMatched, note: profile.rawPhone ? "Verify with the phone number listed on your register entry." : "The register has no phone number for you." },
  ];

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold text-navy">Verification</h1>
        <p className="mt-1 text-sm text-gray-600">What clients see about your identity on your public profile.</p>
      </div>

      <div className={`flex items-start gap-3 rounded-2xl border p-5 ${trust.tone === "pending" ? "border-warning/30 bg-warning/5" : "border-success/30 bg-success/5"}`}>
        <BadgeCheck className={`mt-0.5 h-5 w-5 shrink-0 ${trust.tone === "pending" ? "text-warning" : "text-success"}`} aria-hidden="true" />
        <div>
          <p className="font-bold text-ink">{trust.label}</p>
          <p className="text-sm text-gray-600">{trust.detail}</p>
        </div>
      </div>

      <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white">
        {steps.map(({ icon: Icon, label, done, note }) => (
          <li key={label} className="flex items-start gap-4 p-5">
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-teal" aria-hidden="true" />
            <div className="flex-1">
              <p className="font-semibold text-ink">{label}</p>
              <p className="text-sm text-gray-500">{note}</p>
            </div>
            {done ? <CheckCircle2 className="h-5 w-5 text-success" aria-label="Done" /> : <Circle className="h-5 w-5 text-gray-300" aria-label="Not done" />}
          </li>
        ))}
      </ul>

      {(!trust.emailMatched || !trust.phoneMatched) && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600">
          <p className="mb-3">
            To add a match, run the claim again with the email or phone number on your CICC register entry. Your account, profile and bookings stay the same.
          </p>
          <Link href={`/claim/${profile.licenseNumber}`} className="inline-flex rounded-xl bg-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-ink">
            Verify with register details
          </Link>
          <p className="mt-3 text-xs text-gray-500">
            Register details out of date? Update them with CICC first; Verixa reads the public register and can&apos;t change it.
          </p>
        </div>
      )}
    </main>
  );
}
