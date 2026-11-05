// ============================================================================
// Route: /dashboard/booking
// Why: Consultant bookings inbox plus the availability & pricing editor.
//      The editor existed but was never rendered, so consultants had no way
//      to publish a bookable service.
// ============================================================================
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";
import { canAcceptBookings } from "@/lib/booking-rules";
import ConsultantBookingsList from "./ConsultantBookingsList";
import BookingSettingsForm from "./BookingSettingsForm";

export default async function ConsultantBookingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard/booking");
  if (session.user.role !== "CONSULTANT") redirect("/dashboard");

  const profile = await prisma.consultantProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      consultationTypes: { orderBy: { createdAt: "asc" } },
      weeklyAvailability: { orderBy: { dayOfWeek: "asc" } },
    },
  });
  if (!profile) redirect("/dashboard/profile");

  const bookings = await prisma.booking.findMany({
    where: { consultantProfileId: profile.id },
    include: { type: true },
    orderBy: { scheduledStart: "asc" },
    take: 200,
  });

  const gate = canAcceptBookings(profile);
  const hasTypes = profile.consultationTypes.some((t) => t.isActive);
  const hasHours = profile.weeklyAvailability.some((a) => a.isActive);
  const live = gate.ok && hasTypes && hasHours;
  const missing = !gate.ok ? gate.error : !hasTypes ? "Add at least one consultation type below." : !hasHours ? "Turn on at least one day of availability below." : null;

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-navy">Bookings</h1>
        <p className="text-gray-600">Review requests, manage sessions, and set when and how clients can book you.</p>
      </div>

      <div className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${live ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5"}`} role="status">
        {live ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" /> : <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />}
        <div>
          <p className="font-semibold text-ink">{live ? "Your profile is open for bookings." : "Clients can't book you online yet."}</p>
          {missing && <p className="mt-0.5 text-gray-600">{missing}</p>}
          <Link href={`/consultant/${profile.licenseNumber}`} className="mt-1 inline-block font-semibold text-teal hover:underline">
            View your public profile
          </Link>
        </div>
      </div>

      <ConsultantBookingsList bookings={bookings} />

      <section aria-labelledby="availability-pricing" className="space-y-4">
        <div>
          <h2 id="availability-pricing" className="text-xl font-bold text-navy">Availability &amp; pricing</h2>
          <p className="text-sm text-gray-600">Prices are in CAD. Payments are held in escrow and captured when you accept a request.</p>
        </div>
        <BookingSettingsForm initialProfile={profile} />
      </section>
    </div>
  );
}
