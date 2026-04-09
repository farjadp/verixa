// ============================================================================
// Hardware Source: src/app/dashboard/client/bookings/[id]/page.tsx
// Route: /dashboard/client/bookings/[id]
// Version: 1.0.0 — 2026-04-08
// Why: Authenticated client route for bookings, profile state, saved consultants, and account-level actions.
// Domain: Client Dashboard
// Env / Identity: React Server Component
// Owner: Verixa Web
// Notes: Assumes authenticated session context; unauthorized users must be redirected before data access.
// ============================================================================
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, CalendarDays, Clock, Video, User, ShieldCheck, FileText, CheckCircle2, Circle } from "lucide-react";
import BookingClientActions from "./BookingClientActions";

export default async function BookingDetailsPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user?.email) {
    redirect("/login");
  }

  const { id } = await params;

  const booking = await prisma.booking.findUnique({
    where: { 
      id,
      userEmail: session.user.email 
    },
    include: {
      profile: true,
      type: true,
      events: {
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!booking) {
    notFound();
  }

  // Determine Timeline Progress
  // For MVP: Request Submitted -> Consultant Confirmed -> Meeting Details Shared -> Completed
  const steps = [
    { label: "Request Submitted", active: true, completed: true },
    { label: "Consultant Confirmed", active: booking.status === "CONFIRMED" || booking.status === "COMPLETED", completed: booking.status === "CONFIRMED" || booking.status === "COMPLETED" },
    { label: "Meeting Details Shared", active: !!booking.meetingLink || booking.status === "COMPLETED", completed: !!booking.meetingLink || booking.status === "COMPLETED" },
    { label: "Consultation Completed", active: booking.status === "COMPLETED", completed: booking.status === "COMPLETED" }
  ];

  if (booking.status === "DECLINED" || booking.status === "CANCELLED" || booking.status === "NO_SHOW") {
    steps.push({ label: `Booking ${booking.status}`, active: true, completed: true });
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      
      {/* HEADER */}
      <div>
        <Link href="/dashboard/client/bookings" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#1A1F2B] transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Bookings
        </Link>
        {/* DYNAMIC HEADER BASED ON PHASE 21 SPEC */}
        {booking.status === "PENDING" && (
           <div className="bg-orange-50 border border-orange-100 rounded-3xl p-8 mb-8 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6">
             <div>
               <h1 className="text-3xl font-serif font-black text-orange-900 mb-2">Waiting for confirmation</h1>
               <p className="text-orange-700 font-medium">Your request has been sent. The consultant will review it shortly.</p>
             </div>
             <div className="bg-white/50 px-6 py-3 rounded-xl border border-orange-200/50 backdrop-blur-sm">
               <p className="text-xs font-bold text-orange-900/50 uppercase tracking-widest mb-1">Ref Number</p>
               <p className="font-mono text-orange-900 font-bold">{booking.id.toUpperCase().slice(-8)}</p>
             </div>
           </div>
        )}

        {booking.status === "CONFIRMED" && (
           <div className="bg-[#0F2A44] rounded-3xl p-8 mb-8 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
             <div className="absolute right-0 top-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl mix-blend-screen" />
             <div className="relative z-10">
               <div className="flex items-center gap-3 justify-center md:justify-start mb-3">
                 <CheckCircle2 className="w-8 h-8 text-green-400" />
                 <h1 className="text-3xl font-serif font-black text-white">Your consultation is confirmed</h1>
               </div>
               <p className="text-gray-400 font-medium">Your session is scheduled. Please join on time using the link below.</p>
             </div>
             <div className="relative z-10 shrink-0">
               {booking.meetingLink ? (
                 <a href={booking.meetingLink} target="_blank" rel="noopener noreferrer" className="bg-[#2FA4A9] text-[#1A1F2B] px-8 py-4 rounded-xl text-lg font-black shadow-xl shadow-black/20 hover:bg-[#258d92] transition-all flex items-center gap-3">
                   <Video className="w-6 h-6" /> Join Video Call
                 </a>
               ) : (
                 <span className="bg-white/10 text-white px-6 py-4 rounded-xl text-sm font-bold border border-white/20 whitespace-nowrap">
                    Link pending...
                 </span>
               )}
             </div>
           </div>
        )}

        {(booking.status === "DECLINED" || booking.status === "CANCELLED") && (
           <div className="bg-red-50 border border-red-100 rounded-3xl p-8 mb-8 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6">
             <div>
               <h1 className="text-3xl font-serif font-black text-red-900 mb-2">This booking could not be accepted</h1>
               <p className="text-red-700 font-medium">{booking.status === "DECLINED" ? "The consultant was unable to accept your request." : "This booking has been cancelled."} You can choose another time or explore other consultants.</p>
             </div>
             <div className="shrink-0 flex items-center gap-3">
               <Link href={`/consultant/${booking.profile.slug}`} className="bg-white text-red-900 border border-red-200 px-6 py-3 rounded-xl font-bold shadow-sm hover:bg-red-50 transition-colors whitespace-nowrap">
                 Try Another Time
               </Link>
             </div>
           </div>
        )}

        {booking.status === "COMPLETED" && (
           <div className="bg-[#F8F9FA] border border-gray-200 rounded-3xl p-8 mb-8 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6">
             <div>
               <h1 className="text-3xl font-serif font-black text-[#1A1F2B] mb-2">Session Completed</h1>
               <p className="text-gray-500 font-medium">Thank you for attending your consultation.</p>
             </div>
           </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Consultant & Details */}
        <div className="lg:col-span-2 space-y-8">
           
           {/* CONSULTANT CARD */}
           <div className="bg-white rounded-[24px] border border-[#e5e7eb] p-6 shadow-sm flex items-center gap-5">
              <div className="w-16 h-16 rounded-[16px] bg-[#F5F7FA] flex items-center justify-center shrink-0">
                <User className="w-8 h-8 opacity-40 text-[#2FA4A9]" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-xl font-serif text-[#1A1F2B]">{booking.profile.fullName}</h3>
                  <div className="w-4 h-4 rounded-full bg-green-50 text-green-600 flex items-center justify-center" title="Verified Professional">
                    <ShieldCheck className="w-3 h-3" />
                  </div>
                </div>
                <p className="text-sm text-gray-500 mb-2">{booking.profile.company || "Immigration Consultant"}</p>
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                  <span className="uppercase tracking-widest">RCIC: {booking.profile.licenseNumber}</span>
                </div>
              </div>
           </div>

           {/* SESSION DETAILS */}
           <div className="bg-white rounded-[24px] border border-[#e5e7eb] p-8 shadow-sm">
             <h3 className="text-sm font-bold uppercase tracking-widest text-[#2FA4A9] mb-6">Session Information</h3>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Service</p>
                  <p className="font-bold text-[#1A1F2B]">{booking.type.title}</p>
                </div>
                <div>
                   <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Date & Time</p>
                   <p className="font-bold text-[#1A1F2B] flex items-center gap-2">
                     <CalendarDays className="w-4 h-4 text-[#2FA4A9]" /> {format(new Date(booking.scheduledStart), "MMM d, yyyy")}
                   </p>
                   <p className="text-[#1A1F2B] mt-1 flex items-center gap-2 text-sm font-medium">
                     <Clock className="w-4 h-4 text-[#2FA4A9]" /> {format(new Date(booking.scheduledStart), "h:mm a")} - {format(new Date(booking.scheduledEnd), "h:mm a")}
                   </p>
                </div>
                <div className="md:col-span-2">
                   <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Meeting Method</p>
                   <div className="flex items-center gap-2 p-4 bg-[#F5F7FA] rounded-xl border border-[#e5e7eb] mt-2 text-[#1A1F2B]">
                     <Video className="w-5 h-5 text-[#2FA4A9]" />
                     <div>
                       <p className="font-bold text-sm">{booking.meetingMethod || "Virtual Meeting"}</p>
                       <p className="text-xs text-gray-600 mt-0.5">
                         {booking.meetingLink ? (
                           <a href={booking.meetingLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{booking.meetingLink}</a>
                         ) : "Link will be provided by consultant upon confirmation."}
                       </p>
                     </div>
                   </div>
                </div>

                <div className="md:col-span-2 mt-4 pt-6 border-t border-[#e5e7eb]">
                   <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Your Intake Form</p>
                   <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-4">
                      <div>
                        <span className="text-xs font-bold text-gray-500 block mb-1">Service Needed:</span>
                        <span className="text-sm font-medium text-[#1A1F2B]">{booking.serviceNeeded || "Not specified"}</span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-gray-500 block mb-1">Case Description:</span>
                        <p className="text-sm text-[#1A1F2B] leading-relaxed whitespace-pre-wrap">{booking.caseDescription || "No additional notes provided."}</p>
                      </div>
                   </div>
                </div>
             </div>
           </div>

        </div>

        {/* RIGHT COLUMN: Timeline & Actions */}
        <div className="space-y-6">
          
          <div className="bg-white rounded-[24px] border border-[#e5e7eb] p-6 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-widest text-[#1A1F2B] mb-6">Status Timeline</h3>
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[#e5e7eb] before:to-transparent">
               {steps.map((step, idx) => (
                 <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className={"flex items-center justify-center w-6 h-6 rounded-full border-2 bg-white z-10 shrink-0 mx-auto " + (step.active ? "border-[#2FA4A9] text-[#2FA4A9]" : "border-gray-200 text-gray-200")}>
                      {step.completed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-2.5 h-2.5 fill-current" />}
                    </div>
                    <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-2rem)] p-3 rounded-xl border shadow-sm flex items-center justify-center text-center bg-white border-[#e5e7eb]">
                       <span className={"text-xs font-bold " + (step.active ? "text-[#1A1F2B]" : "text-gray-400")}>{step.label}</span>
                    </div>
                 </div>
               ))}
            </div>
          </div>

          <BookingClientActions 
            bookingId={booking.id} 
            status={booking.status} 
            meetingLink={booking.meetingLink}
            consultantSlug={booking.profile.slug}
          />

        </div>

      </div>

    </div>
  );
}
