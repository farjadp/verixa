// ============================================================================
// Route: /consultant/[license_number]/book
// Why: Booking funnel. Only claimed, verified, active consultants who have
//      published consultation types and availability can be booked.
// ============================================================================
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { ArrowLeft, Lock, ShieldCheck } from "lucide-react";
import { getConsultantBookingConfig } from "@/actions/booking.actions";
import { authOptions } from "@/lib/authOptions";
import TrackPageView from "@/components/TrackPageView";
import ConsultantAvatar, { firstNameOf } from "@/components/consultant/ConsultantAvatar";
import { describeVerification } from "@/lib/verification";
import BookingFlow from "./BookingFlow";

export default async function ClientBookingPage({ params }: { params: Promise<{ license_number: string }> }) {
  const session = await getServerSession(authOptions);
  const { license_number } = await params;
  const licenseNumber = license_number.toUpperCase();

  const data = await getConsultantBookingConfig(licenseNumber);
  if (!data) notFound();

  const trust = describeVerification(data.isClaimed, data.verificationLevel);

  return (
    <div className="flex min-h-screen flex-col bg-mist font-sans text-ink">
      <TrackPageView eventName="booking_flow_started" consultantId={data.id} />

      <header className="sticky top-0 z-20 flex h-16 items-center border-b border-gray-200 bg-white px-4 md:px-8">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <Link href={`/consultant/${licenseNumber}`} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-navy">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to profile
          </Link>
          <Link href="/" className="text-lg font-bold tracking-tight text-navy">
            Verixa<span className="text-teal">.</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-6 p-4 md:p-8 lg:grid-cols-12 lg:gap-10">
        <aside className="order-last space-y-4 lg:order-none lg:col-span-4">
          <div className="rounded-3xl border border-gray-200 bg-white p-6">
            <div className="flex items-center gap-4">
              <ConsultantAvatar name={data.fullName} src={data.avatarImage} size="md" />
              <div className="min-w-0">
                <h1 className="text-lg font-bold leading-tight text-navy">{data.fullName}, RCIC</h1>
                {data.company && <p className="truncate text-sm text-gray-500">{data.company}</p>}
              </div>
            </div>
            <dl className="mt-5 space-y-3 border-t border-gray-100 pt-5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">CICC licence</dt>
                <dd className="font-mono font-semibold text-ink">{data.licenseNumber}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Identity</dt>
                <dd className={`font-semibold ${trust.tone === "verified" || trust.tone === "partial" ? "text-success" : "text-warning"}`}>{trust.label}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Time zone</dt>
                <dd className="font-semibold text-ink">{data.timezone.replace(/_/g, " ")}</dd>
              </div>
            </dl>
          </div>

          <div className="flex gap-3 rounded-2xl border border-teal/30 bg-white p-4 text-sm text-ink">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal" aria-hidden="true" />
            <p>
              Payments are held in escrow by Stripe and only captured when the consultant accepts. Declined or cancelled requests are released or refunded in full.
            </p>
          </div>
        </aside>

        <section className="lg:col-span-8">
          {data.bookable ? (
            <BookingFlow profile={data} sessionUser={session?.user ? { name: session.user.name, email: session.user.email } : undefined} />
          ) : (
            <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center md:p-12">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-mist text-navy">
                <Lock className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-navy">Online booking isn&apos;t available for this consultant</h2>
              <p className="mx-auto mb-8 max-w-md text-sm text-gray-600">{data.notBookableReason}</p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/search" className="rounded-xl bg-navy px-6 py-3 text-sm font-bold text-white hover:bg-ink">
                  Find a bookable consultant
                </Link>
                {!data.isClaimed && (
                  <Link href={`/claim/${data.licenseNumber}`} className="rounded-xl border border-teal px-6 py-3 text-sm font-bold text-teal hover:bg-teal hover:text-white">
                    Are you {firstNameOf(data.fullName)}? Claim this profile
                  </Link>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
