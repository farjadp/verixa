// ============================================================================
// Hardware Source: page.tsx
// Version: 1.0.0 — 2026-03-22
// Why: Consultant Inbox to view, accept, and decline booking requests.
// Env / Identity: React Server Component
// ============================================================================

import { prisma } from "@/lib/prisma";
import BookingActions from "./BookingActions";
import { format } from "date-fns";
import { Inbox, Clock, CalendarDays, Video, Phone, Users } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import ClientDossierModal from "./ClientDossierModal";

export default async function LeadsInboxPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return <div>Auth Error: Not logged in.</div>;

  const profile = await prisma.consultantProfile.findUnique({
    where: { userId: (session.user as any).id }
  });

  if (!profile) return <div>Auth Error: Consultant not found.</div>;

  const bookings = await prisma.booking.findMany({
    where: { consultantProfileId: profile.id },
    orderBy: { scheduledStart: "asc" },
    include: { type: true }
  });

  const pendingCount = bookings.filter(b => b.status === "PENDING").length;

  const userEmails = [...new Set(bookings.map(b => b.userEmail))];
  const usersWithProfiles = await prisma.user.findMany({
    where: { email: { in: userEmails } },
    include: { clientProfile: true }
  });

  const profileMap = usersWithProfiles.reduce((acc, user) => {
    if (user.email && user.clientProfile) {
      acc[user.email] = user.clientProfile;
    }
    return acc;
  }, {} as Record<string, any>);

  return (
    <main className="p-8 max-w-6xl mx-auto space-y-8">
      
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold font-serif text-[#1A1F2B]">Leads & Inbox</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your incoming consultation requests and messages.</p>
      </div>

      <div className="bg-white rounded-3xl border border-[#e5e7eb] shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        
        {/* INBOX TABS */}
        <div className="border-b border-[#e5e7eb] bg-[#ffffff] px-6 py-4 flex gap-6">
           <button className="text-sm font-bold text-[#1A1F2B] border-b-2 border-[#0F2A44] pb-4 -mb-4">
             Booking Requests <span className="ml-2 bg-[#2FA4A9] text-white px-2 py-0.5 rounded-full text-[10px]">{pendingCount}</span>
           </button>
           <button className="text-sm font-bold text-gray-400 hover:text-gray-700 transition-colors pb-4 -mb-4">
             Messages
           </button>
           <button className="text-sm font-bold text-gray-400 hover:text-gray-700 transition-colors pb-4 -mb-4">
             Past Clients
           </button>
        </div>

        {/* BOOKING LIST */}
        <div className="p-6 overflow-x-auto">
          {bookings.length === 0 ? (
            <div className="text-center py-20 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                 <Inbox className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="font-bold text-[#1A1F2B] mb-1">Your inbox is empty</h3>
              <p className="text-sm text-gray-500 max-w-sm">When clients request a consultation from your profile, it will appear here.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-4 text-xs font-bold uppercase tracking-wider text-gray-400">Client</th>
                  <th className="pb-4 text-xs font-bold uppercase tracking-wider text-gray-400">Date & Time</th>
                  <th className="pb-4 text-xs font-bold uppercase tracking-wider text-gray-400">Service</th>
                  <th className="pb-4 text-xs font-bold uppercase tracking-wider text-gray-400">Revenue</th>
                  <th className="pb-4 text-xs font-bold uppercase tracking-wider text-gray-400 text-right">Action / Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bookings.map((booking) => {
                  const clientProfile = profileMap[booking.userEmail];
                  const hasSharedProfile = clientProfile && clientProfile.shareWithConsultant;

                  return (
                  <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="py-5 pr-4">
                      <p className="font-bold text-[#1A1F2B]">{booking.userFirstName} {booking.userLastName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{booking.userEmail}</p>
                      {booking.userPhone && <p className="text-xs text-gray-400">{booking.userPhone}</p>}
                      {hasSharedProfile && <ClientDossierModal clientProfile={clientProfile} />}
                    </td>
                    <td className="py-5 pr-4">
                      <div className="flex items-center gap-1.5 text-sm font-bold text-gray-700 mb-1">
                        <CalendarDays className="w-4 h-4 text-gray-400" />
                        {format(booking.scheduledStart, 'MMM d, yyyy')}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock className="w-3.5 h-3.5" />
                        {format(booking.scheduledStart, 'h:mm a')} - {format(booking.scheduledEnd, 'h:mm a')}
                      </div>
                    </td>
                    <td className="py-5 pr-4">
                      <p className="text-sm font-bold text-gray-700">{booking.type.title}</p>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                        {booking.type.communicationType === 'VIDEO' && <Video className="w-3.5 h-3.5" />}
                        {booking.type.communicationType === 'PHONE' && <Phone className="w-3.5 h-3.5" />}
                        {booking.type.communicationType === 'IN_PERSON' && <Users className="w-3.5 h-3.5" />}
                        {booking.type.communicationType} • {booking.type.durationMinutes} min
                      </div>
                    </td>
                    <td className="py-5 pr-4">
                      <p className="text-sm font-bold text-green-600">${(booking.netAmountCents / 100).toFixed(2)}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">Net Earnings</p>
                    </td>
                    <td className="py-5 text-right pl-4">
                      <BookingActions bookingId={booking.id} currentStatus={booking.status} />
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </main>
  );
}
