// ============================================================================
// Hardware Source: dashboard/booking/page.tsx
// Route: /dashboard/booking
// Version: 1.0.0 — 2026-03-23
// Why: Route entry for /dashboard/booking (structured for SEO, trust, and conversion)
// Env / Identity: React Server Component
// Owner: Verixa Web
// Notes: Keep structure consistent; every section must support Traffic -> Trust -> Booking
// ============================================================================

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import ConsultantBookingsList from "./ConsultantBookingsList";

export default async function ConsultantBookingsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || (session.user as any).role !== "CONSULTANT") {
    redirect("/login");
  }

  const profile = await prisma.consultantProfile.findUnique({
    where: { userId: (session.user as any).id }
  });

  if (!profile) {
    redirect("/dashboard/profile");
  }

  const bookings = await prisma.booking.findMany({
    where: { consultantProfileId: profile.id },
    include: { type: true },
    orderBy: { scheduledStart: "asc" }
  });

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-black text-[#1A1A1A] tracking-tight mb-2">Bookings</h1>
        <p className="text-gray-500 font-medium">Manage your consultations and action incoming requests.</p>
      </div>

      <ConsultantBookingsList bookings={bookings} />
    </div>
  );
}
