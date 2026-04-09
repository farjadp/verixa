// ============================================================================
// Hardware Source: src/app/dashboard/settings/page.tsx
// Route: /dashboard/settings
// Version: 1.0.0 — 2026-04-08
// Why: Authenticated consultant/dashboard route for profile management, booking operations, and workspace workflows.
// Domain: Authenticated Dashboard
// Env / Identity: React Server Component
// Owner: Verixa Web
// Notes: Assumes authenticated session context; unauthorized users must be redirected before data access.
// ============================================================================
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Settings, CalendarDays, Video, Phone, Users, ShieldCheck } from "lucide-react";
import BookingSettingsForm from "./BookingSettingsForm"; // We will create this client component

export default async function ConsultantSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email || (session.user as any).role !== "CONSULTANT") {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) redirect("/login");

  const profile = await prisma.consultantProfile.findUnique({
    where: { userId: user.id },
    include: { bookingSettings: true }
  });

  if (!profile) {
    redirect("/dashboard/setup");
  }

  return (
    <main className="p-8 max-w-4xl mx-auto space-y-8 pb-20">
      
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-[#1A1F2B] mb-2">Booking & Meeting Setup</h1>
        <p className="text-gray-500 font-medium">Configure your availability rules and automate how your meetings are delivered to clients.</p>
      </div>

      <BookingSettingsForm initialData={profile.bookingSettings} />

    </main>
  );
}
