// ============================================================================
// Hardware Source: page.tsx
// Version: 1.0.0 — 2026-03-22
// Why: Client-facing booking engine. Frictionless flow focusing on trust and conversion.
// Env / Identity: React Server Component
// ============================================================================

import { getConsultantBookingConfig } from "@/actions/booking.actions";
import { ArrowLeft, Check, Clock, ShieldCheck, User, Video } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import BookingFlow from "./BookingFlow";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export default async function ClientBookingPage({ params }: { params: Promise<{ license_number: string }> }) {
  const session = await getServerSession(authOptions);
  const resolvedParams = await params;
  const licenseNumber = resolvedParams.license_number.toUpperCase();
  
  let data;
  try {
    data = await getConsultantBookingConfig(licenseNumber);
  } catch (e) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans text-gray-900">
      
      {/* HEADER */}
      <header className="bg-white border-b border-[#e5e7eb] h-20 flex items-center px-8 z-20 sticky top-0">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <Link href={`/consultant/${licenseNumber}`} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#1A1F2B] transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Profile
          </Link>
          <div className="text-xl font-black font-serif tracking-tight text-[#1A1F2B]">
            Verixa<span className="text-[#2FA4A9]">.</span>
          </div>
        </div>
      </header>

      {/* MAIN BOOKING UI */}
      <main className="flex-1 max-w-6xl mx-auto w-full p-6 md:p-12 grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* LEFT: CONSULTANT SUMMARY */}
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-white rounded-3xl p-6 border border-[#e5e7eb] shadow-sm">
             <div className="w-20 h-20 rounded-2xl bg-[#F5F7FA] mb-4 flex items-center justify-center text-[#2FA4A9]">
               <User className="w-8 h-8 opacity-50" />
             </div>
             <div className="flex items-center gap-2 mb-1">
               <h2 className="text-xl font-bold font-serif">{data.fullName}</h2>
               <div className="w-4 h-4 rounded-full bg-green-50 text-green-600 flex items-center justify-center" title="Verified Professional">
                 <ShieldCheck className="w-3 h-3" />
               </div>
             </div>
             <p className="text-sm text-gray-500 mb-6 font-medium">Immigration Consultation</p>
             
             <div className="space-y-4 pt-6 border-t border-[#e5e7eb]">
               <div className="flex gap-3">
                 <Clock className="w-5 h-5 text-gray-400 shrink-0" />
                 <div>
                   <h4 className="text-sm font-bold">30 Minutes</h4>
                   <p className="text-xs text-gray-500 mt-1">Video Call or Phone</p>
                 </div>
               </div>
               <div className="flex gap-3">
                 <Video className="w-5 h-5 text-gray-400 shrink-0" />
                 <div>
                   <h4 className="text-sm font-bold">Google Meet</h4>
                   <p className="text-xs text-gray-500 mt-1">Link provided upon confirmation</p>
                 </div>
               </div>
             </div>
           </div>
           
           <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex gap-3 text-green-800">
             <ShieldCheck className="w-5 h-5 shrink-0" />
             <p className="text-xs font-medium leading-relaxed">Booking through Verixa is secure. Funds are held in escrow until the consultation is completed.</p>
           </div>
        </div>

        {/* RIGHT: BOOKING WIZARD */}
        <div className="lg:col-span-8">
           <BookingFlow profile={data} sessionUser={session?.user} />
        </div>

      </main>

    </div>
  );
}
