// ============================================================================
// Hardware Source: page.tsx
// Version: 1.0.0 — 2026-03-22
// Why: Dedicated Claim Engine for consultants to onboard and claim ownership. Designed for high trust logic and seamless UX.
// Env / Identity: React Server Component
// ============================================================================

import { getConsultantByLicense } from "@/lib/db";
import { notFound } from "next/navigation";
import { ShieldCheck, User, Building2, UploadCloud, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default async function ClaimProfilePage({
  params
}: {
  params: Promise<{ license_number: string }>
}) {
  const resolvedParams = await params;
  const data = getConsultantByLicense(resolvedParams.license_number);
  
  if (!data) {
    notFound();
  }

  const isActive = data.Status?.toLowerCase()?.includes('active');

  return (
    <div className="min-h-screen bg-[#FDFCFB] font-sans text-[#1A1A1A]">
      {/* 
        Simplified Header logic typically used in Checkout/Claim flows 
        to reduce distractions, but keeping the global header for brand consistency.
      */}
      <Header />

      <main className="max-w-2xl mx-auto px-6 py-16">
        
        {/* TOP: CONTEXT / "THIS IS YOUR PROFILE" */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold font-serif mb-3 tracking-tight">Claim Your Profile</h1>
          <p className="text-gray-500 font-medium">Verify your identity to unlock your consultant dashboard and start receiving clients.</p>
        </div>

        <div className="bg-white rounded-[32px] border border-[#f5ecd8] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.03)] overflow-hidden">
          
          {/* PROFILE SNAPSHOT */}
          <div className="bg-[#F6F3F0] p-6 border-b border-[#f5ecd8] flex items-center gap-5">
            <div className="w-16 h-16 bg-white border border-[#f5ecd8] rounded-[16px] shadow-sm flex items-center justify-center shrink-0">
               <User className="w-7 h-7 text-[#C29967]/40" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold font-serif tracking-tight">{data.Full_Name}</h2>
                {isActive && (
                  <div title="Active License" className="flex items-center justify-center p-1 rounded-full bg-[#F6F3F0] border border-[#f5ecd8]">
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 font-medium">
                <span>RCIC: <strong className="text-[#1A1A1A]">{data.License_Number}</strong></span>
                <span>•</span>
                <span className="capitalize">{data.Status}</span>
              </div>
            </div>
          </div>

          <form className="p-8 space-y-8" action="/api/claim" method="POST">
            
            {/* MIDDLE: THE FORM */}
            <div className="space-y-5">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                 {/* Readonly: Full Name */}
                 <div className="space-y-2">
                   <label className="text-[13px] font-bold uppercase tracking-wider text-gray-400">Full Name</label>
                   <input 
                     type="text" 
                     value={data.Full_Name} 
                     readOnly 
                     className="w-full bg-gray-50 border border-transparent px-4 py-3 rounded-[12px] text-[#1A1A1A] font-medium outline-none cursor-not-allowed" 
                   />
                 </div>
                 {/* Readonly: License */}
                 <div className="space-y-2">
                   <label className="text-[13px] font-bold uppercase tracking-wider text-gray-400">License Number</label>
                   <input 
                     type="text" 
                     value={data.License_Number} 
                     readOnly 
                     className="w-full bg-gray-50 border border-transparent px-4 py-3 rounded-[12px] text-[#1A1A1A] font-medium outline-none cursor-not-allowed" 
                   />
                 </div>
               </div>

               {/* Business Email */}
               <div className="space-y-2">
                 <label htmlFor="email" className="text-[13px] font-bold uppercase tracking-wider text-[#1A1A1A]">Work Email <span className="text-red-500">*</span></label>
                 <input 
                   type="email" 
                   id="email" 
                   name="email" 
                   placeholder="e.g. name@yourpractice.com" 
                   required
                   className="w-full bg-white border border-[#f5ecd8] px-4 py-3.5 rounded-[12px] text-[#1A1A1A] focus:border-[#C29967]/50 focus:ring-4 focus:ring-[#C29967]/5 transition-all outline-none shadow-sm"
                 />
                 <div className="bg-[#FDFCFB] p-4 rounded-[16px] border border-[#f5ecd8] mt-3 shadow-sm">
                   <h4 className="text-[11px] font-black text-[#C29967] uppercase tracking-widest mb-2">Important: Verified Badge</h4>
                   <ul className="text-xs text-gray-500 space-y-3 font-medium">
                     <li className="flex items-start gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-sm shrink-0 mt-1"></div> 
                       <p><strong className="text-[#1A1A1A]">Instant Verification:</strong> Use the exact email registered on the CICC registry or a matching corporate domain.</p>
                     </li>
                     <li className="flex items-start gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-sm shrink-0 mt-1"></div> 
                       <p><strong className="text-[#1A1A1A]">Pending Verification:</strong> You can enter the dashboard with a personal email now, but your public profile won't get the 'Verified Badge' until you upload ID later.</p>
                     </li>
                   </ul>
                 </div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                 {/* Phone */}
                 <div className="space-y-2">
                   <label htmlFor="phone" className="text-[13px] font-bold uppercase tracking-wider text-[#1A1A1A]">Phone Number</label>
                   <input 
                     type="tel" 
                     id="phone" 
                     name="phone" 
                     placeholder="+1 (555) 000-0000" 
                     className="w-full bg-white border border-[#f5ecd8] px-4 py-3.5 rounded-[12px] text-[#1A1A1A] focus:border-[#C29967]/50 focus:ring-4 focus:ring-[#C29967]/5 transition-all outline-none shadow-sm"
                   />
                 </div>
                 {/* Company Name */}
                 <div className="space-y-2">
                   <label htmlFor="company" className="text-[13px] font-bold uppercase tracking-wider text-[#1A1A1A]">Company / Clinic</label>
                   <input 
                     type="text" 
                     id="company" 
                     name="company" 
                     defaultValue={data.Company || ''}
                     placeholder="Your Practice Name" 
                     className="w-full bg-white border border-[#f5ecd8] px-4 py-3.5 rounded-[12px] text-[#1A1A1A] focus:border-[#C29967]/50 focus:ring-4 focus:ring-[#C29967]/5 transition-all outline-none shadow-sm"
                   />
                 </div>
               </div>

               {/* Website */}
               <div className="space-y-2">
                 <label htmlFor="website" className="text-[13px] font-bold uppercase tracking-wider text-[#1A1A1A]">Website URL</label>
                 <input 
                   type="url" 
                   id="website" 
                   name="website" 
                   placeholder="https://www.yourpractice.com" 
                   className="w-full bg-white border border-[#f5ecd8] px-4 py-3.5 rounded-[12px] text-[#1A1A1A] focus:border-[#C29967]/50 focus:ring-4 focus:ring-[#C29967]/5 transition-all outline-none shadow-sm"
                 />
               </div>
            </div>

            <hr className="border-[#f5ecd8]" />

            {/* CTA */}
            <div className="space-y-4 pt-2">
              <Link 
                href="/dashboard/setup" 
                className="w-full flex items-center justify-center bg-[#1A1A1A] text-white py-4.5 rounded-[16px] font-bold hover:bg-black transition-all shadow-xl shadow-black/10 text-[15px]"
              >
                Claim & Enter Dashboard
              </Link>
              
              <div className="text-center">
                <Link href="/dashboard/setup" className="text-[13px] font-bold text-gray-400 hover:text-[#C29967] transition-colors underline decoration-transparent hover:decoration-[#C29967]/30 underline-offset-4">
                  Skip for now. I'll complete my profile later.
                </Link>
              </div>
            </div>

            {/* WARNINGS */}
            <div className="space-y-3 bg-[#F6F3F0] p-5 rounded-[16px] mt-6 border border-[#f5ecd8]/50">
              <p className="flex items-start gap-2 text-xs text-gray-500 font-medium">
                <ShieldCheck className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                This process grants access to public platform features and does not change your official CICC registry data.
              </p>
              <p className="flex items-start gap-2 text-xs text-gray-500 font-medium">
                <AlertCircle className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                Verixa may request additional verification (e.g., video call or CICC ID upload) if our automated system detects a mismatch.
              </p>
            </div>

          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
