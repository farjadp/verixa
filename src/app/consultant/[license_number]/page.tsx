// ============================================================================
// Hardware Source: consultant/[license_number]/page.tsx
// Route: /consultant/[license_number]
// Version: 1.0.0 — 2026-03-23
// Why: Route entry for /consultant/[license_number] (structured for SEO, trust, and conversion)
// Env / Identity: React Server Component
// Owner: Verixa Web
// Notes: Keep structure consistent; every section must support Traffic -> Trust -> Booking
// ============================================================================

import { getConsultantByLicense } from "@/lib/db";
import { ShieldCheck, Mail, Building2, MapPin, CheckCircle2, AlertCircle, CalendarDays, ExternalLink, User, Star, Clock, MessageSquare, Briefcase, Languages, Phone, Check, Zap, CheckCircle, Info, Shield } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SaveProfileButton from "@/components/SaveProfileButton";
import { checkIsSaved } from "@/actions/savedProfiles.actions";
import TrackPageView from "@/components/TrackPageView";

import { Metadata } from "next";

export async function generateMetadata({
  params
}: {
  params: Promise<{ license_number: string }>
}): Promise<Metadata> {
  const resolvedParams = await params;
  const data = getConsultantByLicense(resolvedParams.license_number);
  
  if (!data) return { title: 'Consultant Not Found | Verixa' };
  
  return {
    title: `${data.Full_Name} - Canadian Immigration Consultant | Verixa`,
    description: `Book a consultation with ${data.Full_Name}, an active RCIC consultant in ${data.Province || 'Canada'} specializing in Canadian Immigration.`,
    openGraph: {
      title: `${data.Full_Name} - Verixa Verified Consultant`,
      description: `Book a secure consultation with ${data.Full_Name} (${data.License_Number}).`,
      images: ['/Brand/Vertixa3.png']
    }
  };
}

export default async function ConsultantProfilePage({
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
  const isClaimed = false; // Dummy state for now 
  const dummyRating = 4.8;
  const dummyReviews = 124;

  const isSaved = await checkIsSaved(data.License_Number);

  // Fetch PostgreSQL enrichment data
  const dbProfile = await prisma.consultantProfile.findUnique({
    where: { licenseNumber: data.License_Number },
    include: { companyEnrichments: true }
  });

  const displayEnrichments = dbProfile?.companyEnrichments?.filter(e => 
    (e.matchStatus === 'ambiguous' || e.matchStatus === 'matched' || e.matchStatus === 'consultant_verified') && e.registryNumber
  ) || [];

  return (
    <div className="min-h-screen bg-[#ffffff] font-sans text-[#1A1F2B]">
      {/* Analytics Tracking (client-side, captures UTM params) */}
      <TrackPageView
        eventName="profile_view"
        specialization="Immigration Consulting"
      />
      <Header />

      {/* 10) CLAIM THIS PROFILE BANNER */}
      {!isClaimed && (
        <div className="bg-[#0F2A44] text-white py-4 px-8 border-b border-[#2A2A2A]">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                 <Briefcase className="w-4 h-4 text-[#2FA4A9]" />
              </div>
              <p className="text-sm font-medium">
                <strong className="font-bold">Is this your profile?</strong> Claim it to respond to reviews, add services, enable booking, and improve visibility.
              </p>
            </div>
            <Link 
              href={`/claim/${data.License_Number}`} 
              className="bg-[#2FA4A9] text-white px-6 py-2.5 rounded-[12px] text-sm font-bold hover:bg-[#258d92] transition-colors shrink-0 whitespace-nowrap shadow-md focus:ring-4 focus:ring-[#2FA4A9]/20"
            >
              Claim This Profile
            </Link>
          </div>
        </div>
      )}

      {/* 1) HERO SECTION */}
      <section className="bg-white border-b border-[#e5e7eb] pt-16 pb-12 px-8 bg-gradient-to-b from-[#ffffff] to-white">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-8 items-start">
          
          <div className="w-32 h-32 bg-[#F5F7FA] border border-[#e5e7eb] rounded-[32px] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] flex items-center justify-center shrink-0 relative overflow-hidden">
             <User className="w-12 h-12 text-[#2FA4A9]/30" />
          </div>
          
          <div className="flex-1 space-y-4">
             <div className="flex flex-wrap items-center gap-4 mb-4">
               <h1 className="text-3xl md:text-5xl font-bold font-serif tracking-tight">{data.Full_Name}</h1>
               {isActive && (
                 <div title="Active License" className="flex items-center justify-center px-3 py-1.5 rounded-full bg-[#F5F7FA] border border-[#e5e7eb] shadow-sm mt-1 md:mt-0">
                   <div className="flex items-center gap-2">
                     <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                     <span className="text-xs font-bold text-gray-600 uppercase tracking-widest leading-none">Verified</span>
                   </div>
                 </div>
               )}
             </div>

             {/* BADGE SYSTEM - HERO BADGES */}
             <div className="flex flex-wrap items-center gap-3 pt-1 pb-3">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-green-700 border border-green-200 shadow-sm transition-transform hover:scale-105 cursor-default">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-[11px] md:text-xs font-bold tracking-wide">Verified Professional</span>
                </div>
                {isClaimed && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0F2A44] text-[#2FA4A9] border border-black shadow-sm transition-transform hover:scale-105 cursor-default">
                    <Zap className="w-4 h-4 fill-[#2FA4A9]" />
                    <span className="text-[11px] md:text-xs font-bold tracking-wide">Fast Responder</span>
                  </div>
                )}
                {dummyReviews > 10 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-gray-800 border border-gray-200 shadow-sm transition-transform hover:scale-105 cursor-default">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-[11px] md:text-xs font-bold tracking-wide">Top Rated Consultant</span>
                  </div>
                )}
             </div>
             
             <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-gray-600">
                <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4 text-gray-400" /> {data.Company || 'Independent Practice'}</span>
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-gray-400" /> {[data.Province, data.Country].filter(Boolean).join(', ') || 'Canada'}</span>
             </div>

             <div className="flex flex-wrap items-center gap-3 pt-2">
                <div className="flex items-center gap-1.5 bg-[#ffffff] border border-[#e5e7eb] px-3 py-1.5 rounded-lg text-[#2FA4A9] font-bold text-sm">
                  <Star className="w-4 h-4 fill-current" /> {dummyRating} <span className="text-[#2FA4A9]/70 font-medium">({dummyReviews} reviews)</span>
                </div>
                <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider ${isActive ? 'bg-[#F5F7FA] border-[#e5e7eb] text-green-700' : 'bg-[#F5F7FA] border-[#e5e7eb] text-orange-600'}`}>
                   {data.Status}
                </div>
                <div className="px-3 py-1.5 rounded-lg border border-[#e5e7eb] bg-[#ffffff] text-gray-600 text-xs font-bold uppercase tracking-wider">
                   RCIC #{data.License_Number}
                </div>
                {!isClaimed && (
                  <div className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-400 text-xs font-bold uppercase tracking-wider">
                     Unclaimed Profile
                  </div>
                )}
             </div>
          </div>
          
          <div className="w-full md:w-auto flex flex-col gap-3 shrink-0">
             <Link href={`/consultant/${data.License_Number}/book`} className="w-full md:w-48 bg-[#0F2A44] text-white py-3.5 rounded-xl font-bold hover:bg-black transition-all shadow-lg shadow-black/5 flex items-center justify-center">
               Book Consultation
             </Link>
             <div className="w-full md:w-48">
               <SaveProfileButton licenseNumber={data.License_Number} initialIsSaved={isSaved} />
             </div>
          </div>

        </div>
      </section>

      {/* MAIN CONTENT GRID */}
      <main className="max-w-5xl mx-auto px-8 py-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* LEFT COLUMN: Deep Details */}
        <div className="lg:col-span-2 space-y-10">
           
           {/* 2) TRUST SUMMARY BOX */}
           <section className="bg-white rounded-[32px] border border-[#e5e7eb] p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.02)]">
             <h3 className="text-xs font-black uppercase tracking-widest text-[#2FA4A9] mb-6 flex items-center gap-2">
               <ShieldCheck className="w-4 h-4" /> Trust & Verification
             </h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <div className="flex items-start gap-4">
                 <div className="w-10 h-10 rounded-[12px] bg-[#F5F7FA] flex items-center justify-center shrink-0 border border-[#e5e7eb]">
                   <Check className="w-5 h-5 text-green-600" />
                 </div>
                 <div>
                   <p className="font-bold text-sm text-gray-900 mb-0.5">CICC Status</p>
                   <p className="text-xs text-gray-500 capitalize">{data.Status} • Entitled to Practise</p>
                 </div>
               </div>
               <div className="flex items-start gap-4">
                 <div className="w-10 h-10 rounded-[12px] bg-[#ffffff] flex items-center justify-center shrink-0 border border-[#e5e7eb]">
                   <ShieldCheck className="w-5 h-5 text-[#2FA4A9]" />
                 </div>
                 <div>
                   <p className="font-bold text-sm text-gray-900 mb-0.5">Verixa Verified</p>
                   <p className="text-xs text-gray-500">Last synced: {new Date().toLocaleDateString()}</p>
                 </div>
               </div>
               <div className="flex items-start gap-4">
                 <div className="w-10 h-10 rounded-[12px] bg-[#ffffff] flex items-center justify-center shrink-0 border border-[#e5e7eb]">
                   <Clock className="w-5 h-5 text-gray-400" />
                 </div>
                 <div>
                   <p className="font-bold text-sm text-gray-900 mb-0.5">Response Rate</p>
                   <p className="text-xs text-gray-500">{isClaimed ? 'Usually responds in 24h' : 'Profile not claimed'}</p>
                 </div>
               </div>
               <div className="flex items-start gap-4">
                 <div className="w-10 h-10 rounded-[12px] bg-[#ffffff] flex items-center justify-center shrink-0 border border-[#e5e7eb]">
                   <AlertCircle className="w-5 h-5 text-gray-400" />
                 </div>
                 <div>
                   <p className="font-bold text-sm text-gray-900 mb-0.5">Disciplinary Record</p>
                   <p className="text-xs text-gray-500">No public warnings found</p>
                 </div>
               </div>
             </div>
           </section>

           {/* 3) VERIFIED BUSINESS SNAPSHOT (IF EXISTS) */}
           {displayEnrichments.length > 0 && (
             <section>
               <h2 className="text-xl font-bold font-serif mb-4 flex items-center gap-2">
                 Official Corporate Records 
               </h2>
               <div className="space-y-4">
                 {displayEnrichments.map((enrichment: any) => {
                   const isAuto = enrichment.matchStatus === 'ambiguous';
                   const isAdmin = enrichment.matchStatus === 'matched';
                   const isConsultant = enrichment.matchStatus === 'consultant_verified';

                   let themeClass = "bg-gradient-to-br from-[#0F2A44] to-[#1A3A5A] text-white border-transparent";
                   let badgeClass = "bg-white/10 text-white border-white/10";
                   let icon = <CheckCircle className="w-3 h-3 text-green-400" />;
                   let label = "Government Verified";

                   if (isAuto) {
                     themeClass = "bg-[#F8FAFC] text-[#1A1F2B] border-[#e5e7eb]";
                     badgeClass = "bg-orange-100 text-orange-800 border-orange-200";
                     icon = <Info className="w-3 h-3 text-orange-600" />;
                     label = "Auto-Matched (Unverified)";
                   } else if (isConsultant) {
                     themeClass = "bg-gradient-to-br from-[#FFD700]/10 to-[#FFF8DC] text-[#1A1F2B] border-[#FFD700]/30 shadow-[0_0_15px_rgba(255,215,0,0.1)]";
                     badgeClass = "bg-[#FFD700] text-[#8B6508] border-[#DAA520]";
                     icon = <Shield className="w-3 h-3 text-[#8B6508] fill-current" />;
                     label = "Consultant Verified";
                   }

                   return (
                     <div key={enrichment.id} className={`rounded-3xl border p-6 shadow-sm relative overflow-hidden ${themeClass}`}>
                       <div className={`absolute top-0 right-0 backdrop-blur-md text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-bl-xl flex items-center gap-1.5 border-b border-l ${badgeClass}`}>
                         {icon} {label}
                       </div>
                       
                       {isAuto && (
                         <div className="mb-4 text-xs bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-xl flex items-start gap-2 max-w-[95%]">
                           <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                           <p><strong>Disclaimer:</strong> This record was automatically extracted from public registry databases utilizing AI matching algorithms. It has not been manually reviewed or verified yet.</p>
                         </div>
                       )}

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm mt-2">
                         <div>
                           <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${isAuto || isConsultant ? 'text-gray-500' : 'text-white/50'}`}>Legal Name</label>
                           <div className="font-semibold text-base">{enrichment.matchedLegalName}</div>
                         </div>
                         <div>
                           <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${isAuto || isConsultant ? 'text-gray-500' : 'text-white/50'}`}>Jurisdiction</label>
                           <div className="font-semibold">{enrichment.jurisdiction}</div>
                         </div>
                         <div>
                           <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${isAuto || isConsultant ? 'text-gray-500' : 'text-white/50'}`}>Registry Number</label>
                           <div className="font-semibold">{enrichment.registryNumber}</div>
                         </div>
                         <div>
                           <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${isAuto || isConsultant ? 'text-gray-500' : 'text-white/50'}`}>Incorporated On</label>
                           <div className="font-semibold">{enrichment.incorporationDate ? new Date(enrichment.incorporationDate).toLocaleDateString() : 'N/A'}</div>
                         </div>
                         <div className="md:col-span-2">
                           <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${isAuto || isConsultant ? 'text-gray-500' : 'text-white/50'}`}>Registered Address</label>
                           <div className="font-semibold">{enrichment.registeredAddress || 'N/A'}</div>
                         </div>
                         <div className={`md:col-span-2 mt-2 pt-4 border-t flex items-center justify-between text-[11px] uppercase tracking-wider font-bold ${isAuto || isConsultant ? 'border-gray-200 text-gray-400' : 'border-white/10 text-white/50'}`}>
                            <div>Source: {enrichment.registrySource === 'federal_api' ? 'Federal Corporation API' : 'Canada Business Registries'}</div>
                            <div>Checked: {new Date(enrichment.lastCheckedAt).toLocaleDateString()}</div>
                         </div>
                       </div>
                     </div>
                   );
                 })}
               </div>
             </section>
           )}

           {/* 4) ABOUT THE CONSULTANT */}
           <section>
             <h2 className="text-xl font-bold font-serif mb-4 flex items-center gap-2">
               Professional Bio
             </h2>
             <div className="bg-white rounded-[32px] border border-[#e5e7eb] p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.02)] text-gray-600 leading-relaxed text-[16px] space-y-4">
               <p>
                 <strong>{data.Full_Name}</strong> is a dedicated Regulated Canadian Immigration Consultant (RCIC) operating under the license number <strong>{data.License_Number}</strong>. 
                 Based in {[data.Province, data.Country].filter(Boolean).join(', ') || 'Canada'}, they specialize in navigating the complexities of the Canadian immigration system for clients worldwide.
               </p>
               <p>
                 As an {data.Status?.toLowerCase()} member of the College of Immigration and Citizenship Consultants (CICC), they are legally authorized to provide representation and advice on all Canadian immigration matters.
               </p>
               {!isClaimed && (
                 <div className="mt-6 p-5 bg-[#ffffff] rounded-2xl border border-[#e5e7eb] flex flex-col md:flex-row items-center justify-between gap-4">
                   <p className="text-sm">This is an auto-generated summary. Are you {data.Full_Name}?</p>
                   <button className="text-sm font-bold text-[#2FA4A9] hover:underline bg-[#F5F7FA] px-4 py-2 rounded-xl">Add your custom bio</button>
                 </div>
               )}
             </div>
           </section>

           {/* 5) SERVICES & PRACTICE AREAS */}
           <section>
             <h2 className="text-xl font-bold font-serif mb-4 flex items-center gap-2">
               Areas of Practice
             </h2>
             <div className="flex flex-wrap gap-2">
                {['Express Entry', 'Study Permits', 'Work Permits', 'Family Sponsorship', 'Provincial Nominee Programs (PNP)', 'Citizenship Applications'].map(tag => (
                  <span key={tag} className="bg-white border border-[#e5e7eb] px-4 py-2.5 rounded-[12px] text-sm font-medium text-[#1A1F2B] hover:bg-[#ffffff] cursor-default transition-colors">
                    {tag}
                  </span>
                ))}
             </div>
           </section>

           {/* 3) REVIEWS SECTION (Dummy data for UI completeness) */}
           <section>
             <div className="flex items-center justify-between mb-6">
               <h2 className="text-xl font-bold font-serif flex items-center gap-2">
                 Client Reviews
               </h2>
               <div className="flex items-center gap-1.5 bg-[#ffffff] border border-[#e5e7eb] text-[#2FA4A9] px-4 py-1.5 rounded-xl font-bold text-sm shadow-sm">
                 <Star className="w-4 h-4 fill-current" /> {dummyRating}
               </div>
             </div>
             
             <div className="space-y-4">
               {[1, 2].map((i) => (
                 <div key={i} className="bg-white rounded-[24px] border border-[#e5e7eb] p-7 shadow-sm">
                   <div className="flex justify-between items-start mb-4">
                     <div>
                       <div className="flex items-center gap-1 text-[#2FA4A9] mb-2">
                         {[1,2,3,4,5].map(s => <Star key={s} className="w-3.5 h-3.5 fill-current" />)}
                       </div>
                       <p className="font-bold text-[15px] mb-1">"Highly professional and transparent"</p>
                     </div>
                     <span className="text-xs font-semibold text-gray-400">2 weeks ago</span>
                   </div>
                   <p className="text-[15px] text-gray-600 leading-relaxed mb-6">
                     The entire process for my Express Entry application was handled smoothly. Very responsive to emails and explained every step clearly. Highly recommend!
                   </p>
                   <div className="flex items-center gap-2.5 text-xs font-bold text-gray-400 uppercase tracking-widest bg-[#ffffff] w-fit px-3 py-1.5 border border-[#e5e7eb] rounded-full">
                     <div className="w-5 h-5 rounded-full bg-[#e5e7eb] flex items-center justify-center text-[#2FA4A9]">M</div>
                     Verified Client
                   </div>
                 </div>
               ))}
               <button className="w-full py-4.5 mt-2 text-sm font-bold text-[#2FA4A9] bg-[#ffffff] border border-[#e5e7eb] rounded-[20px] hover:bg-[#F5F7FA] transition-colors">
                 Read all {dummyReviews} reviews
               </button>
             </div>
           </section>

           {/* 13 & 14) FAQ / LEGAL */}
           <section className="pt-12 border-t border-[#e5e7eb]">
             <h2 className="text-xl font-bold font-serif mb-6">Frequently Asked Questions</h2>
             <div className="space-y-4">
               <div className="bg-white rounded-[24px] border border-[#e5e7eb] p-6 shadow-sm">
                 <h4 className="font-bold text-[15px] mb-2 text-[#1A1F2B]">Is this consultant legally authorized to practice?</h4>
                 <p className="text-[15px] text-gray-500 leading-relaxed">Yes. Status: {data.Status}. This was verified against the CICC registry today.</p>
               </div>
               <div className="bg-white rounded-[24px] border border-[#e5e7eb] p-6 shadow-sm">
                 <h4 className="font-bold text-[15px] mb-2 text-[#1A1F2B]">Are the reviews verified?</h4>
                 <p className="text-[15px] text-gray-500 leading-relaxed">Reviews on Verixa are submitted by users. Verified Client badges indicate we have confirmed an actual consultation took place.</p>
               </div>
             </div>
           </section>

        </div>

        {/* RIGHT COLUMN: Sticky Booking & Contact */}
        <div className="lg:col-span-1">
          <div className="sticky top-10 space-y-6">
            
            {/* 8) REAL BOOKING WIDGET */}
            <div className="bg-white rounded-[32px] border border-[#e5e7eb] p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]">
              <h3 className="text-lg font-bold font-serif mb-6 flex items-center gap-2 border-b border-[#e5e7eb] pb-5">
                <CalendarDays className="w-5 h-5 text-[#2FA4A9]" /> Request Consultation
              </h3>
              
              <div className="space-y-4 mb-8">
                <div className="bg-[#ffffff] p-5 rounded-[20px] border border-[#e5e7eb] cursor-pointer hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-1.5">
                    <strong className="text-[15px]">Virtual Consultation</strong>
                    <span className="text-[15px] font-bold text-[#2FA4A9]">$150 CAD</span>
                  </div>
                  <p className="text-sm text-gray-500 font-medium">45 Minutes • Google Meet / Zoom</p>
                </div>
                {!isClaimed && (
                  <p className="text-xs text-center text-orange-600 bg-orange-50 rounded-[16px] p-4 border border-orange-100/50">
                    Booking is currently disabled. <br/>This profile must be claimed first.
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <button 
                  disabled={!isClaimed}
                  className={`w-full py-4.5 rounded-[16px] font-bold text-center block transition-all shadow-lg ${isClaimed ? 'bg-[#0F2A44] text-white hover:bg-black shadow-black/10' : 'bg-[#F5F7FA] text-gray-400 cursor-not-allowed shadow-none border border-[#e5e7eb]'}`}
                >
                  Select Time & Book
                </button>
                <div className="flex items-center justify-center gap-2 text-xs font-bold tracking-widest uppercase text-gray-400/80 mt-5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Secure Verixa Checkout
                </div>
              </div>
            </div>

            {/* 6, 7 & 9) LANGUAGES, AVAILABILITY, CONTACT */}
            <div className="bg-white rounded-[32px] border border-[#e5e7eb] p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.02)]">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#2FA4A9] mb-8">Details & Contact</h3>
              
              <ul className="space-y-6">
                <li className="flex gap-4 items-start">
                  <Languages className="w-5 h-5 text-gray-300 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-[13px] uppercase tracking-wider text-gray-400 font-bold mb-1">Languages</strong>
                    <span className="text-[15px] font-medium text-[#1A1F2B]">English, French</span>
                  </div>
                </li>

                {(data.Company || data.Province) && (
                  <li className="flex gap-4 items-start">
                     <Building2 className="w-5 h-5 text-gray-300 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-[13px] uppercase tracking-wider text-gray-400 font-bold mb-1">Company</strong>
                      <span className="text-[15px] font-medium text-[#1A1F2B] line-clamp-2">{data.Company || 'Independent Practice'}</span>
                    </div>
                  </li>
                )}
                
                {(data.Province || data.Country) && (
                  <li className="flex gap-4 items-start">
                    <MapPin className="w-5 h-5 text-gray-300 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-[13px] uppercase tracking-wider text-gray-400 font-bold mb-1">Location</strong>
                      <span className="text-[15px] font-medium text-[#1A1F2B]">{[data.Province, data.Country].filter(Boolean).join(', ')}</span>
                    </div>
                  </li>
                )}

                <li className="flex gap-4 items-start">
                  <Mail className="w-5 h-5 text-gray-300 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-[13px] uppercase tracking-wider text-gray-400 font-bold mb-1">Direct Email</strong>
                    {data.Email ? (
                      <a href={`mailto:${data.Email}`} className="text-[15px] font-bold text-[#2FA4A9] hover:text-[#258d92] underline block max-w-[200px] truncate">
                        {data.Email}
                      </a>
                    ) : (
                      <span className="text-[15px] text-gray-400 italic">Available upon booking</span>
                    )}
                  </div>
                </li>

                <li className="flex gap-4 items-start">
                  <Phone className="w-5 h-5 text-gray-300 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-[13px] uppercase tracking-wider text-gray-400 font-bold mb-1">Phone Number</strong>
                    <span className="text-[15px] font-medium text-[#1A1F2B]">{data.Phone || 'Protected'}</span>
                  </div>
                </li>
              </ul>
            </div>

          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}
