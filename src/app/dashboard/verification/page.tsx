// ============================================================================
// Hardware Source: page.tsx
// Version: 1.0.0 — 2026-03-22
// Why: Dashboard Verification Center. Where consultants upload ID or verify email to get the 'Verified Badge'.
// Env / Identity: React Server Component
// ============================================================================

import { CheckCircle2, FileText, Mail, ShieldAlert, ShieldCheck, UploadCloud } from "lucide-react";

export default function VerificationPage() {
  return (
    <main className="p-8 max-w-4xl mx-auto space-y-8">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-[#1A1A1A]">Identity Verification</h1>
          <p className="text-gray-500 text-sm mt-1">Verify your identity to unlock the Verified Badge and build trust.</p>
        </div>
        <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 px-4 py-2 rounded-xl text-sm font-bold">
          <ShieldAlert className="w-4 h-4" /> Unverified
        </div>
      </div>

      <div className="space-y-8 pb-16">
        
        {/* WHAT IS THE VERIFIED BADGE */}
        <div className="bg-[#1A1A1A] rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-black/10">
          <div className="absolute -right-16 -top-16 opacity-5">
            <ShieldCheck className="w-64 h-64" />
          </div>
          <div className="relative z-10">
            <h2 className="text-xl font-bold font-serif mb-2 text-[#C29967]">Why get verified?</h2>
            <p className="text-gray-400 text-sm max-w-xl mb-6">Profiles with the 'Verified Badge' appear higher in search results, receive up to 3x more bookings, and instantly build trust with prospective clients.</p>
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm font-medium">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#C29967]" /> Higher Search Ranking</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#C29967]" /> "Verified" Profile Badge</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#C29967]" /> Enable Direct Booking</li>
            </ul>
          </div>
        </div>

        {/* VERIFICATION OPTIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* OPTION 1: EMAIL */}
          <div className="bg-white rounded-3xl border border-[#f5ecd8] p-6 shadow-sm flex flex-col">
             <div className="w-12 h-12 rounded-xl bg-[#F6F3F0] text-[#C29967] flex items-center justify-center mb-5">
               <Mail className="w-6 h-6" />
             </div>
             <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">Verify via Business Email</h3>
             <p className="text-sm text-gray-500 mb-6 flex-1">Fastest method. We'll send a magic link to the email associated with your CICC registry profile or corporate domain.</p>
             
             <div className="space-y-3">
               <input type="email" placeholder="name@yourpractice.com" className="w-full bg-[#FDFCFB] border border-[#f5ecd8] px-4 py-3 rounded-xl text-[#1A1A1A] text-sm focus:border-[#C29967]/50 focus:ring-4 focus:ring-[#C29967]/10 outline-none transition-all" />
               <button className="w-full bg-[#F6F3F0] text-[#1A1A1A] border border-[#f5ecd8] px-4 py-3 rounded-xl text-sm font-bold hover:bg-[#f5ecd8] transition-colors">
                 Send Magic Link
               </button>
             </div>
          </div>

          {/* OPTION 2: UPLOAD */}
          <div className="bg-white rounded-3xl border border-[#f5ecd8] p-6 shadow-sm flex flex-col">
             <div className="w-12 h-12 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center mb-5 border border-gray-100">
               <FileText className="w-6 h-6" />
             </div>
             <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">Upload Identity Documents</h3>
             <p className="text-sm text-gray-500 mb-6 flex-1">Use this if you use a personal email (like Gmail or Yahoo). Requires manual review by our team within 2-3 business days.</p>
             
             <div className="w-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:border-gray-300 transition-colors cursor-pointer">
               <UploadCloud className="w-6 h-6 text-gray-400 mb-2" />
               <p className="text-xs font-bold text-gray-600 mb-1">Click to upload or drag & drop</p>
               <p className="text-[10px] text-gray-400">PDF, JPG or PNG (max. 10MB)</p>
               <p className="text-[10px] text-gray-400 mt-2">Required: CICC Certificate + Gov ID</p>
             </div>
          </div>

        </div>

      </div>
    </main>
  );
}
