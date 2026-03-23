// ============================================================================
// Hardware Source: dashboard/client/settings/page.tsx
// Route: /dashboard/client/settings
// Version: 1.0.0 — 2026-03-23
// Why: Route entry for /dashboard/client/settings (structured for SEO, trust, and conversion)
// Env / Identity: React Server Component
// Owner: Verixa Web
// Notes: Keep structure consistent; every section must support Traffic -> Trust -> Booking
// ============================================================================

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SettingsForm from "./SettingsForm";
import PasswordForm from "./PasswordForm";

export default async function ClientSettingsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      email: true,
      hashedPassword: true, // to know if we should show password form
      accounts: true,
    }
  });

  if (!user) redirect("/login");

  const hasPassword = !!user.hashedPassword;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-[#1A1F2B]">Account & Preferences</h1>
        <p className="text-gray-500 mt-2">Manage your personal information, security settings, and notifications.</p>
      </div>

      <div className="grid grid-cols-1 gap-10">
        
        {/* Profile Details */}
        <section className="bg-white rounded-[32px] border border-[#e5e7eb] p-8 shadow-sm">
           <div className="mb-6">
             <h2 className="text-xl font-bold font-serif text-[#1A1F2B]">Personal Information</h2>
             <p className="text-sm text-gray-500 mt-1">Update your name and contact details used for bookings.</p>
           </div>
           
           <SettingsForm user={{ name: user.name || "", email: user.email || "" }} />
        </section>

        {/* Security */}
        {hasPassword && (
          <section className="bg-white rounded-[32px] border border-[#e5e7eb] p-8 shadow-sm">
             <div className="mb-6">
               <h2 className="text-xl font-bold font-serif text-[#1A1F2B]">Security & Password</h2>
               <p className="text-sm text-gray-500 mt-1">Update your password to keep your account secure.</p>
             </div>
             
             <PasswordForm />
          </section>
        )}

      </div>
    </div>
  );
}
