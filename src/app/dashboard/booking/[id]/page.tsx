// ============================================================================
// Hardware Source: dashboard/booking/[id]/page.tsx
// Route: /dashboard/booking/[id]
// Version: 1.0.0 — 2026-03-23
// Why: Route entry for /dashboard/booking/[id] (structured for SEO, trust, and conversion)
// Env / Identity: React Server Component
// Owner: Verixa Web
// Notes: Keep structure consistent; every section must support Traffic -> Trust -> Booking
// ============================================================================

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { User, MapPin, Globe, Clock, Banknote, CalendarDays, Key, AlertCircle, Video } from "lucide-react";
import ConsultantActionPanel from "./ConsultantActionPanel";

export default async function ConsultantBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "CONSULTANT") redirect("/login");

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { 
      type: true, 
      events: { orderBy: { createdAt: 'desc' } },
      profile: { include: { bookingSettings: true } }
    }
  });

  if (!booking) redirect("/dashboard/booking");

  const profile = await prisma.consultantProfile.findUnique({ where: { userId: (session.user as any).id } });
  if (booking.consultantProfileId !== profile?.id) redirect("/dashboard/booking");

  return (
    <div className="p-8 max-w-5xl mx-auto">
      
      <div className="mb-8">
        <div className="flex items-center gap-3 text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">
          <span>Bookings</span>
          <span className="w-1 h-1 rounded-full bg-gray-300" />
          <span className="text-[#C29967]">{booking.id.slice(0, 8)}</span>
        </div>
        <h1 className="text-3xl font-serif font-black text-[#1A1A1A] tracking-tight">Booking Details</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: ACTIONS & CASE INFO */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* ACTION PANEL EXCLUSIVE TO CONSULTANTS */}
          <ConsultantActionPanel booking={booking} />

          {/* CASE AND CLIENT INFO */}
          <div className="bg-white border border-[#f5ecd8] rounded-3xl p-8 space-y-8">
            <h3 className="font-bold text-xl text-[#1A1A1A] border-b border-[#f5ecd8] pb-4">Intake Form & Case Details</h3>
            
            <div className="grid grid-cols-2 gap-y-6 gap-x-12">
               <div>
                 <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Service Requested</p>
                 <p className="font-bold text-lg text-[#1A1A1A]">{booking.serviceNeeded || booking.type.title}</p>
               </div>
               <div>
                 <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Urgency</p>
                 <p className="font-bold text-lg text-[#1A1A1A]">{booking.urgency || "Not Specified"}</p>
               </div>
               <div>
                 <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Communication Method</p>
                 <div className="flex items-center gap-2 font-bold text-lg text-[#1A1A1A]">
                    <Video className="w-5 h-5 text-[#C29967]" />
                    {booking.preferredCommunicationMethod || "Online / Zoom"}
                 </div>
               </div>
               <div>
                 <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Session Rate</p>
                 <p className="font-bold text-lg text-[#1A1A1A] text-green-700">CA ${(booking.grossAmountCents / 100).toFixed(2)}</p>
               </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
               <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Case Description</p>
               <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 whitespace-pre-wrap text-gray-700 leading-relaxed font-medium text-sm">
                 {booking.caseDescription || "No case description provided by the client."}
               </div>
            </div>
          </div>

          {/* EVENT LOG */}
          <div className="bg-white border border-[#f5ecd8] rounded-3xl p-8">
            <h3 className="font-bold text-xl text-[#1A1A1A] mb-6">Activity Log</h3>
            <div className="space-y-6 pl-2 border-l-2 border-gray-100">
               {booking.events.map((event, i) => (
                 <div key={event.id} className="relative pl-6">
                   <div className="absolute -left-[35px] top-1 w-4 h-4 rounded-full border-4 border-white bg-[#C29967]" />
                   <p className="font-bold text-[#1A1A1A] text-sm">{event.action.replace(/_/g, " ")}</p>
                   {event.notes && <p className="text-gray-500 text-sm mt-1">{event.notes}</p>}
                   <p className="text-xs text-gray-400 font-bold uppercase mt-1.5">{format(new Date(event.createdAt), "MMM d, yyyy - h:mm a")}</p>
                 </div>
               ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CLIENT SUMMARY WIDGET */}
        <div className="space-y-6">
          <div className="bg-[#1A1A1A] text-white rounded-3xl p-8 shadow-xl sticky top-28">
             <div className="w-16 h-16 rounded-full bg-[#333] border-4 border-[#222] flex items-center justify-center text-2xl font-black mb-6">
                {booking.userFirstName[0]}{booking.userLastName[0]}
             </div>
             <h2 className="text-2xl font-serif font-bold mb-1">{booking.userFirstName} {booking.userLastName}</h2>
             <p className="text-[#C29967] font-bold text-sm mb-6 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> Client Profile</p>

             <div className="space-y-4">
               <div className="flex items-start gap-3 border-t border-[#333] pt-4">
                 <MapPin className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                 <div>
                   <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Country of Residence</p>
                   <p className="font-bold">{booking.country || "Not specified"}</p>
                 </div>
               </div>
               <div className="flex items-start gap-3 border-t border-[#333] pt-4">
                 <Globe className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                 <div>
                   <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Preferred Language</p>
                   <p className="font-bold">{booking.preferredLanguage || "English"}</p>
                 </div>
               </div>
               <div className="flex items-start gap-3 border-t border-[#333] pt-4">
                 <CalendarDays className="w-5 h-5 text-[#C29967] shrink-0 mt-0.5" />
                 <div>
                   <p className="text-xs text-[#C29967] font-bold uppercase tracking-wider">Scheduled Time</p>
                   <p className="font-bold text-lg">{format(new Date(booking.scheduledStart), "MMM d, h:mm a")}</p>
                 </div>
               </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
