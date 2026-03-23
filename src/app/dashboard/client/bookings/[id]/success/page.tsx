import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock, CalendarDays, Video, ArrowRight, User } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default async function BookingSubmissionSuccessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { profile: { include: { user: true } }, type: true }
  });

  if (!booking) redirect("/dashboard/client");
  // Security check: ensure only the owner can see the success page
  if (booking.userEmail !== session.user?.email) redirect("/dashboard/client");

  return (
    <div className="min-h-screen bg-white flex flex-col items-center pt-24 pb-12 px-6">
      
      {/* SECTION 1: HERO */}
      <div className="text-center max-w-2xl mx-auto space-y-4 mb-12">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
           <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        <h1 className="text-4xl font-black font-serif text-[#1A1A1A] tracking-tight">Your booking request has been sent</h1>
        <p className="text-gray-500 text-lg">
           Your request is securely logged and we have notified {booking.profile.user?.name}. Please wait for confirmation.
        </p>
      </div>

      <div className="w-full max-w-3xl space-y-8">
        
        {/* SECTION 2: BOOKING SUMMARY */}
        <div className="bg-[#1A1A1A] text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden">
           <div className="absolute right-0 top-0 w-64 h-64 bg-[#C29967]/10 rounded-full blur-3xl mix-blend-screen" />
           <div className="relative z-10">
             
             <div className="flex items-center justify-between border-b border-[#333] pb-6 mb-6">
                <div>
                  <p className="text-[#C29967] uppercase font-bold text-xs tracking-widest mb-1">Status</p>
                  <p className="text-orange-400 font-bold flex items-center gap-2"><Clock className="w-4 h-4" /> Pending Approval</p>
                </div>
                <div className="text-right">
                  <p className="text-[#C29967] uppercase font-bold text-xs tracking-widest mb-1">Total</p>
                  <p className="text-xl font-bold">CA ${(booking.grossAmountCents / 100).toFixed(2)}</p>
                </div>
             </div>

             <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
               <div>
                  <p className="text-gray-400 font-bold text-xs uppercase mb-1">Consultant</p>
                  <p className="font-bold">{booking.profile.user?.name}</p>
               </div>
               <div>
                  <p className="text-gray-400 font-bold text-xs uppercase mb-1">Service</p>
                  <p className="font-bold">{booking.type.title}</p>
               </div>
               <div>
                  <p className="text-gray-400 font-bold text-xs uppercase mb-1">Time</p>
                  <p className="font-bold">{format(new Date(booking.scheduledStart), "MMM d, h:mm a")}</p>
               </div>
               <div>
                  <p className="text-gray-400 font-bold text-xs uppercase mb-1">Method</p>
                  <p className="font-bold flex items-center gap-1.5"><Video className="w-4 h-4 text-gray-400" /> {booking.preferredCommunicationMethod || "Online"}</p>
               </div>
             </div>
           </div>
        </div>

        {/* SECTION 3: NEXT STEPS */}
        <div className="bg-[#FDFCFB] border-2 border-[#f5ecd8] rounded-3xl p-8">
           <h3 className="text-xl font-bold text-[#1A1A1A] mb-6">What happens next?</h3>
           <div className="space-y-6 relative">
              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-200" />
              
              <div className="relative pl-12">
                 <div className="absolute left-0 top-0.5 w-8 h-8 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center font-bold text-sm">1</div>
                 <h4 className="font-bold text-[#1A1A1A] text-lg">Consultant Reviews Request</h4>
                 <p className="text-gray-500 mt-1">The consultant will review your case details and proposed time.</p>
              </div>

              <div className="relative pl-12">
                 <div className="absolute left-0 top-0.5 w-8 h-8 rounded-full bg-white border-2 border-gray-200 text-gray-400 flex items-center justify-center font-bold text-sm">2</div>
                 <h4 className="font-bold text-[#1A1A1A] text-lg">You Receive Confirmation</h4>
                 <p className="text-gray-500 mt-1">Once accepted, you will receive an email with the exact meeting link and any custom instructions.</p>
              </div>

              <div className="relative pl-12">
                 <div className="absolute left-0 top-0.5 w-8 h-8 rounded-full bg-white border-2 border-gray-200 text-gray-400 flex items-center justify-center font-bold text-sm">3</div>
                 <h4 className="font-bold text-[#1A1A1A] text-lg">Join the Session</h4>
                 <p className="text-gray-500 mt-1">At the scheduled time, join the session using the provided link to meet your consultant.</p>
              </div>
           </div>
        </div>

        {/* SECTION 4: ACTIONS */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
           <Link href={`/dashboard/client/bookings/${booking.id}`} className="flex-1 bg-[#1A1A1A] text-white font-bold py-4 rounded-xl text-center hover:bg-black transition-colors shadow-xl shadow-black/10">
             Track Booking Status
           </Link>
           <Link href="/dashboard/client" className="flex-1 bg-white border-2 border-gray-100 text-[#1A1A1A] font-bold py-4 rounded-xl text-center hover:bg-gray-50 transition-colors">
             Back to Dashboard
           </Link>
        </div>

      </div>
    </div>
  );
}
