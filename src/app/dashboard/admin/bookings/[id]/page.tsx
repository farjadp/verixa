// ============================================================================
// Hardware Source: dashboard/admin/bookings/[id]/page.tsx
// Route: /dashboard/admin/bookings/[id]
// Version: 1.0.0 — 2026-03-23
// Why: Route entry for /dashboard/admin/bookings/[id] (structured for SEO, trust, and conversion)
// Env / Identity: React Server Component
// Owner: Verixa Web
// Notes: Keep structure consistent; every section must support Traffic -> Trust -> Booking
// ============================================================================

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { User, CalendarDays, Clock, MapPin, Video, FileText, Banknote, ShieldCheck, Mail, ArrowLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function AdminBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") redirect("/login");

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      type: true,
      profile: { include: { user: true } },
      events: { orderBy: { createdAt: "desc" } }
    }
  });

  if (!booking) notFound();

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      
      {/* HEADER SECTION */}
      <div>
        <Link href="/dashboard/admin" className="text-gray-500 hover:text-white flex items-center gap-2 text-sm font-bold mb-4 w-fit transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>
        
        <div className="flex items-center gap-3 text-sm font-bold text-gray-500 uppercase tracking-widest mb-2 border border-gray-800 bg-[#1A1A1A] w-fit px-3 py-1 rounded-full">
          <span>Booking Audit</span>
          <span className="w-1 h-1 rounded-full bg-gray-500" />
          <span className="text-gray-300 font-mono">{booking.id}</span>
        </div>
        <h1 className="text-3xl font-serif font-black text-white tracking-tight flex gap-4 items-center">
          Event Details
          <span className={`px-3 py-1 text-[10px] uppercase tracking-wider font-bold rounded-lg font-sans ${
             booking.status === "CONFIRMED" ? "bg-green-500/10 text-green-400 border border-green-500/20" :
             booking.status === "PENDING" ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" :
             booking.status === "COMPLETED" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
             "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}>
            Status: {booking.status}
          </span>
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: IDENTITIES */}
        <div className="space-y-6 lg:col-span-1">
           
           <div className="bg-[#1A1A1A] border border-gray-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-10 blur-xl group-hover:blur-2xl transition-all duration-500 text-blue-500">
               <User className="w-32 h-32" />
             </div>
             
             <div className="flex items-center gap-3 mb-6 relative">
               <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                 <User className="w-4 h-4" />
               </div>
               <h2 className="text-lg font-bold text-white tracking-wide">Client Profile</h2>
             </div>

             <div className="space-y-4 relative">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Full Name</p>
                  <p className="text-gray-200 font-medium text-lg">{booking.userFirstName} {booking.userLastName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Email Address</p>
                  <p className="text-gray-200 font-medium font-mono text-sm">{booking.userEmail}</p>
                </div>

             </div>
           </div>

           <div className="bg-[#1A1A1A] border border-gray-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-10 blur-xl group-hover:blur-2xl transition-all duration-500 text-[#C29967]">
               <ShieldCheck className="w-32 h-32" />
             </div>
             
             <div className="flex items-center gap-3 mb-6 relative">
               <div className="w-8 h-8 rounded-full bg-[#C29967]/10 flex items-center justify-center text-[#C29967]">
                 <ShieldCheck className="w-4 h-4" />
               </div>
               <h2 className="text-lg font-bold text-white tracking-wide">Consultant Profile</h2>
             </div>

             <div className="space-y-4 relative">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Provider Name</p>
                  <p className="text-gray-200 font-medium text-lg">{booking.profile.fullName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Account Email</p>
                  <p className="text-gray-200 font-medium font-mono text-sm">{booking.profile.user?.email || "No email linked"}</p>
                </div>
                <div className="pt-2">
                  <Link href={`/dashboard/admin/consultants`} className="inline-flex items-center gap-2 text-xs font-bold text-[#C29967] hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 hover:border-white/20">
                    View Consultant Record <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
             </div>
           </div>
        </div>

        {/* MIDDLE/RIGHT COLUMN: MEETING & FINANCIALS */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#1A1A1A] border border-gray-800 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <CalendarDays className="w-5 h-5 text-purple-400" />
                  <h3 className="font-bold text-white text-sm">Schedule Information</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                    <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Date</span>
                    <span className="text-gray-200 font-medium">{format(new Date(booking.scheduledStart), 'MMMM do, yyyy')}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                    <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Time</span>
                    <span className="text-gray-200 font-medium">
                      {format(new Date(booking.scheduledStart), 'h:mm a')} - {format(new Date(booking.scheduledEnd), 'h:mm a')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Service</span>
                    <span className="text-gray-200 font-bold">{booking.serviceNeeded || booking.type.title}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#1A1A1A] border border-gray-800 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Banknote className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-white text-sm">Financial Breakdown</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                    <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Gross Total</span>
                    <span className="text-emerald-400 font-mono font-bold">${(booking.grossAmountCents / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                    <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Platform Fee</span>
                    <span className="text-red-400 font-mono font-bold">-${(booking.platformFeeCents / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Consultant Base</span>
                    <span className="text-gray-200 font-mono font-bold">${((booking.grossAmountCents - booking.platformFeeCents) / 100).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#1A1A1A] border border-gray-800 rounded-3xl p-6 shadow-2xl">
             <div className="flex items-center gap-3 mb-6">
               <FileText className="w-5 h-5 text-gray-400" />
               <h3 className="font-bold text-white text-lg">Case Notes & Meeting Metadata</h3>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
               
               <div className="space-y-6">

               </div>

               <div className="space-y-6">
                 <div>
                   <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Meeting Destination</p>
                   <div className="bg-black/50 border border-gray-800 rounded-xl p-4 space-y-3">
                     <div className="flex justify-between items-center border-b border-gray-800/50 pb-2">
                       <span className="text-xs text-gray-500 uppercase font-bold tracking-widest">Method</span>
                       <span className="text-sm font-bold text-gray-200">{booking.meetingMethod || "Pending"}</span>
                     </div>
                     <div className="flex justify-between items-center border-b border-gray-800/50 pb-2">
                       <span className="text-xs text-gray-500 uppercase font-bold tracking-widest">Network</span>
                       <span className="text-sm font-bold text-gray-200">{(booking as any).meetingProvider || "Manual"}</span>
                     </div>
                     <div className="flex justify-between items-center pt-1">
                       <span className="text-xs text-gray-500 uppercase font-bold tracking-widest">Target URL</span>
                       <span className="text-xs font-mono text-blue-400 break-all pl-4 text-right">{booking.meetingLink || "Pending assignment"}</span>
                     </div>
                   </div>
                 </div>

                 <div>
                   <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Consultant Output Instructions</p>
                   <div className="bg-black/50 border border-gray-800 rounded-xl p-4 text-sm text-gray-300 min-h-[80px] leading-relaxed">
                     {booking.consultantNotes ? booking.consultantNotes : <span className="opacity-50 italic">No notes created yet.</span>}
                   </div>
                 </div>
               </div>

             </div>
          </div>

          <div className="bg-[#1A1A1A] border border-gray-800 rounded-3xl p-6 shadow-2xl">
            <h3 className="font-bold text-white text-lg mb-6">Audit Trail</h3>
            <div className="space-y-4">
              {booking.events.map((event) => (
                <div key={event.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 bg-[#C29967] rounded-full mt-1.5" />
                    <div className="w-1 bg-gray-800 flex-1 mt-2 mb-1" />
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-bold text-gray-200">
                      <span className="uppercase text-[10px] bg-white/5 text-gray-400 px-2 py-0.5 rounded mr-2 tracking-widest">{event.actorType}</span>
                      {event.action.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{format(new Date(event.createdAt), 'MMM d, yyyy h:mm a')}</p>
                    {event.notes && <p className="text-sm text-gray-400 mt-2 bg-white/5 mx-[-12px] px-3 py-2 rounded-lg">{event.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
