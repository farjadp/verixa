// ============================================================================
// Hardware Source: src/app/terms/page.tsx
// Route: /terms
// Version: 1.0.0 — 2026-04-08
// Why: Legal/compliance route that defines policy boundaries, user obligations, and liability terms.
// Domain: Legal & Compliance
// Env / Identity: React Server Component
// Owner: Verixa Web
// Notes: Policy content page; changes should align with legal requirements and published policy versions.
// ============================================================================
import { ShieldAlert, Scale, CheckCircle, AlertTriangle } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Terms of Service | Verixa",
  description: "Verixa Terms of Service - Platform Operating Agreements and User Obligations",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#F5F7FA] font-sans selection:bg-[#2FA4A9] selection:text-white">
      <Header />
      <div className="pt-32 pb-20">
        
        {/* HEADER SECTION */}
        <div className="max-w-4xl mx-auto px-6 lg:px-8 mb-16">
          <div className="flex items-center gap-3 text-[#0F2A44] font-bold tracking-widest uppercase text-sm mb-4">
            <ShieldAlert className="w-5 h-5" />
            <span>Legal Infrastructure</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-black text-[#0F2A44] tracking-tight mb-6 font-serif">
            Verixa Terms of Service
          </h1>
          <p className="text-lg text-gray-500 font-medium flex items-center gap-3">
            Effective Date: <span className="text-[#0F2A44] font-bold">March 23, 2026</span>
          </p>
        </div>

        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 p-8 lg:p-14 text-gray-600">
            
            {/* 1. Acceptance */}
            <section className="space-y-4 mb-12">
              <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
                <span className="text-[#2FA4A9]">1.</span> Acceptance of Terms
              </h2>
              <p className="text-[15px] leading-relaxed">
                By accessing or using Verixa (“the Platform”), you agree to be bound by these Terms of Service. If you do not agree, you must not use the Platform.
              </p>
            </section>

            <hr className="border-gray-100 mb-12" />

            {/* 2. Nature of Platform */}
            <section className="space-y-6 mb-12">
              <h2 className="text-2xl font-bold text-red-700 flex items-center gap-2">
                <span className="text-red-500">2.</span> Nature of the Platform (CRITICAL)
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <p className="text-[14px] mb-3">Verixa is a technology platform that:</p>
                  <ul className="list-none pl-0 space-y-2 text-[14px] font-medium text-[#0F2A44]">
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[#2FA4A9] shrink-0"/> Connects users with independent immigration consultants</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[#2FA4A9] shrink-0"/> Enables discovery, comparison, and booking</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[#2FA4A9] shrink-0"/> Facilitates communication between users & consultants</li>
                  </ul>
                </div>
                
                <div className="bg-[#1A1F2B] p-6 rounded-2xl border border-[#0F2A44] text-white shadow-lg relative overflow-hidden">
                  <Scale className="absolute top-4 right-4 w-24 h-24 text-white opacity-5" />
                  <h4 className="font-bold text-amber-400 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Legal Clarification
                  </h4>
                  <p className="text-[13px] text-gray-300 mb-3">Verixa specifically is <strong>NOT</strong>:</p>
                  <ul className="list-disc pl-5 space-y-1 marker:text-amber-400 text-[13px] font-medium">
                    <li>NOT an immigration consultant</li>
                    <li>NOT a law firm</li>
                    <li>Does NOT provide legal or immigration advice</li>
                    <li>Does NOT represent users before IRCC or any authority</li>
                  </ul>
                  <p className="text-[12px] text-amber-200 mt-4 border-t border-white/20 pt-3">All services are provided by independent licensed consultants.</p>
                </div>
              </div>
            </section>

            <hr className="border-gray-100 mb-12" />

            {/* 3 & 4 */}
            <div className="grid md:grid-cols-2 gap-10 mb-12">
              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
                  <span className="text-[#2FA4A9]">3.</span> Eligibility
                </h2>
                <ul className="list-disc pl-5 space-y-2 text-[15px]">
                  <li>Be at least 18 years old</li>
                  <li>Provide accurate information</li>
                  <li>Comply with applicable laws</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
                  <span className="text-[#2FA4A9]">4.</span> User Accounts
                </h2>
                <p className="text-[15px]">Users are responsible for maintaining account confidentiality and all activity under their account.</p>
                <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-sm text-red-900 mt-2">
                  <strong>Termination Risk:</strong> Verixa may suspend accounts if false information is provided or abuse is detected.
                </div>
              </section>
            </div>

            <hr className="border-gray-100 mb-12" />

            {/* 5. Consultant Profiles */}
            <section className="space-y-6 mb-12">
              <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2 mb-4">
                <span className="text-[#2FA4A9]">5.</span> Consultant Profiles
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white border rounded-xl p-5 shadow-sm space-y-2">
                  <h4 className="font-bold text-[#0F2A44]">5.1 Source of Data</h4>
                  <p className="text-sm">Some consultant information may be sourced from publicly available regulatory registries (e.g., CICC).</p>
                </div>
                <div className="bg-white border rounded-xl p-5 shadow-sm space-y-2">
                  <h4 className="font-bold text-[#0F2A44]">5.2 Accuracy Disclaimer</h4>
                  <p className="text-sm">Verixa does not guarantee completeness or real-time accuracy. Users must independently verify status via official sources.</p>
                </div>
                <div className="bg-white border rounded-xl p-5 shadow-sm space-y-2">
                  <h4 className="font-bold text-[#0F2A44]">5.3 Claiming Profiles</h4>
                  <p className="text-sm">Consultants may claim profiles. Verixa reserves the right to verify identity, request docs, or reject claims.</p>
                </div>
              </div>
            </section>

            <hr className="border-gray-100 mb-12" />

            {/* 6. Reviews & 7. Booking */}
            <div className="grid lg:grid-cols-5 gap-10 mb-12">
              <section className="lg:col-span-2 space-y-4">
                <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
                  <span className="text-[#2FA4A9]">6.</span> Reviews & Ratings
                </h2>
                <p className="text-[15px]">Users may leave reviews based on actual experiences.</p>
                <ul className="list-disc pl-5 space-y-1 text-sm marker:text-[#2FA4A9]">
                  <li>Must be truthful</li>
                  <li>Must not be defamatory</li>
                  <li>Must not be misleading</li>
                </ul>
                <p className="text-xs text-gray-500 mt-2 italic">Verixa may moderate content or suspend accounts for abuse.</p>
              </section>

              <section className="lg:col-span-3 space-y-4">
                <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
                  <span className="text-[#2FA4A9]">7.</span> Booking & Payments
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <h5 className="font-bold text-sm text-[#0F2A44] mb-1">7.1 Booking Process</h5>
                    <p className="text-xs text-gray-600">Subject to consultant availability and confirmed only after consultant acceptance.</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <h5 className="font-bold text-sm text-[#0F2A44] mb-1">7.2 Payment Processing</h5>
                    <p className="text-xs text-gray-600">Processed via Stripe. We do not store full payment details. Funds may be held until booking confirmation.</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 sm:col-span-2">
                    <h5 className="font-bold text-sm text-[#0F2A44] mb-1">7.3 Platform Fees</h5>
                    <p className="text-xs text-gray-600">Verixa may charge service fees and commissions. All fees are disclosed at the time of transaction.</p>
                  </div>
                </div>
              </section>
            </div>

            <hr className="border-gray-100 mb-12" />

            {/* 8. Cancellations & 9. Responsibility */}
            <div className="grid md:grid-cols-2 gap-10 mb-12">
              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
                  <span className="text-[#2FA4A9]">8.</span> Cancellations
                </h2>
                <ul className="list-disc pl-5 space-y-2 text-[14px]">
                  <li>Cancellation policies vary by consultant.</li>
                  <li>Users must follow the consultant’s specific policy.</li>
                  <li>Refunds (if applicable) are processed according to platform rules.</li>
                </ul>
                <p className="text-xs text-gray-500 mt-2">Verixa may mediate disputes and issue refunds at its discretion in certain cases.</p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
                  <span className="text-[#2FA4A9]">9.</span> Consultant Responsibility
                </h2>
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                  <p className="text-[13px] text-amber-900 mb-2 font-medium">Consultants are solely responsible for:</p>
                  <ul className="text-[13px] list-disc pl-5 space-y-1 text-amber-800 marker:text-amber-500">
                    <li>Services provided</li>
                    <li>Advice given</li>
                    <li>Compliance with applicable laws</li>
                  </ul>
                  <p className="text-[13px] text-amber-900 mt-3 font-bold">Verixa is not responsible for the outcomes of consultations or the quality of services.</p>
                </div>
              </section>
            </div>

            <hr className="border-gray-100 mb-12" />

            {/* 10. Conduct & 11. IP */}
            <div className="grid md:grid-cols-2 gap-10 mb-12">
              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
                  <span className="text-[#2FA4A9]">10.</span> User Conduct
                </h2>
                <p className="text-sm font-medium mb-2">Users agree NOT to:</p>
                <ul className="list-none pl-0 space-y-2 text-sm">
                  <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5"></div> Provide false info or impersonate others</li>
                  <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5"></div> Misuse the platform or attempt fraud</li>
                  <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5"></div> Harass consultants</li>
                </ul>
                <p className="text-xs text-red-600 font-bold mt-2">Violations yield account suspension or legal action.</p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
                  <span className="text-[#2FA4A9]">11.</span> Intellectual Property
                </h2>
                <p className="text-[14px]">All platform content (excluding user-generated content) is owned by Verixa.</p>
                <div className="bg-gray-50 p-3 rounded border text-sm text-gray-700">
                  Users may not copy, distribute, or reuse without permission.
                </div>
              </section>
            </div>

            <hr className="border-gray-100 mb-12" />

             {/* 13 & 14 THE LIABILITY WALL */}
             <div className="bg-white border-2 border-[#0F2A44] p-8 lg:p-10 rounded-3xl shadow-xl mb-12">
              <div className="space-y-10">
                
                <section>
                  <h2 className="text-2xl font-black text-[#0F2A44] flex items-center gap-2 mb-4">
                    <span className="text-red-500">13.</span> Limitation of Liability (VERY IMPORTANT)
                  </h2>
                  <p className="text-[15px] font-bold text-red-600 uppercase tracking-wide mb-3">To the fullest extent permitted by law:</p>
                  <p className="text-[15px] text-gray-800 mb-2">Verixa shall not be liable for:</p>
                  <ul className="text-[14px] list-disc pl-5 space-y-3 font-medium text-gray-600 marker:text-[#0F2A44]">
                    <li>Decisions made based on consultant advice</li>
                    <li>Losses resulting from consultations</li>
                    <li>Indirect or consequential damages</li>
                    <li>Third-party actions</li>
                  </ul>
                </section>

                <div className="h-px bg-gray-200 w-full" />

                <section>
                  <h2 className="text-2xl font-black text-[#0F2A44] flex items-center gap-2 mb-4">
                    <span className="text-red-500">14.</span> No Guarantee of Results
                  </h2>
                  <p className="text-[15px] text-gray-800 font-medium mb-3">Verixa does <strong>NOT</strong> guarantee:</p>
                  <ul className="text-[14px] list-none pl-0 space-y-2 mb-4 font-medium text-gray-600">
                    <li className="flex gap-3 items-center"><span className="text-[10px]">❌</span> Immigration outcomes</li>
                    <li className="flex gap-3 items-center"><span className="text-[10px]">❌</span> Visa approvals</li>
                    <li className="flex gap-3 items-center"><span className="text-[10px]">❌</span> Success of applications</li>
                  </ul>
                  <p className="text-sm bg-[#F5F7FA] p-4 rounded-xl border border-gray-200">
                    All outcomes depend entirely on user circumstances, consultant actions, and autonomous government decisions.
                  </p>
                </section>

              </div>
             </div>

             <hr className="border-gray-100 mb-12" />

             {/* 15, 16, 17, 18. Wrap up logistics */}
             <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
               <div className="space-y-2">
                 <h4 className="font-bold text-[#0F2A44]">15. Indemnification</h4>
                 <p className="text-xs text-gray-600">Users agree to indemnify Verixa against claims arising from misuse, terms violations, or consultant disputes.</p>
               </div>
               <div className="space-y-2">
                 <h4 className="font-bold text-[#0F2A44]">16. Suspension</h4>
                 <p className="text-xs text-gray-600">Access may be terminated if terms are violated, fraud is detected, or legal risk arises.</p>
               </div>
               <div className="space-y-2">
                 <h4 className="font-bold text-[#0F2A44]">17. Third-Party</h4>
                 <p className="text-xs text-gray-600">The platform relies on third parties (e.g., Stripe). Verixa is not responsible for their system failures.</p>
               </div>
               <div className="space-y-2">
                 <h4 className="font-bold text-[#0F2A44]">18. Modifications</h4>
                 <p className="text-xs text-gray-600">These Terms may be updated. Continued usage instantly constitutes acceptance of the new changes.</p>
               </div>
             </div>

             <hr className="border-gray-100 mb-12" />

             {/* 19, 20, 21. Formal Jurisdiction */}
             <div className="grid md:grid-cols-3 gap-6 mb-6">
                <section className="bg-gray-50 border p-5 rounded-2xl">
                  <h4 className="font-bold text-[#0F2A44] mb-2 text-sm">19. Governing Law</h4>
                  <p className="text-sm">These Terms are governed strictly by the laws of:</p>
                  <p className="text-sm font-bold text-[#2FA4A9] mt-2 bg-white px-3 py-2 rounded border">Province of Ontario, Canada</p>
                  <p className="text-xs mt-2 text-gray-500">and applicable federal laws.</p>
                </section>
                
                <section className="bg-gray-50 border p-5 rounded-2xl">
                  <h4 className="font-bold text-[#0F2A44] mb-2 text-sm">20. Dispute Resolution</h4>
                  <p className="text-xs text-gray-600 mb-2">Disputes should first be addressed through direct communication or platform support.</p>
                  <p className="text-xs font-medium">Verixa may provide mediation where appropriate.</p>
                </section>
                
                <section className="bg-gray-50 border p-5 rounded-2xl">
                  <h4 className="font-bold text-[#0F2A44] mb-2 text-sm">21. Contact Information</h4>
                  <p className="text-xs text-gray-600 mb-2">For legal inquiries regarding these terms:</p>
                  <p className="text-sm font-medium mt-1">Email: <em>legal@getverixa.com</em></p>
                  <p className="text-sm font-medium">Platform contact form</p>
                </section>
             </div>

             {/* THE IMMUTABLE FACILITATOR MANTRA */}
             <div className="mt-20 lg:mt-24">
               <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#0F2A44] via-[#163859] to-[#2FA4A9] p-10 lg:p-16 text-center shadow-2xl border border-[#2FA4A9]/20">
                 {/* Internal lighting */}
                 <div className="absolute top-0 right-0 w-64 h-64 bg-[#2FA4A9] opacity-20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                 
                 <Scale className="w-12 h-12 text-teal-400/50 mx-auto mb-6" />
                 
                 <h2 className="relative z-10 text-3xl md:text-5xl lg:text-6xl font-black text-white tracking-tight mb-8 drop-shadow-xl font-serif">
                   “We connect.<br/>We don’t advise.<br/>We don’t guarantee.”
                 </h2>
                 <p className="relative z-10 text-teal-100 font-medium text-lg max-w-2xl mx-auto tracking-wide">
                   Verixa is engineered strictly as a technology facilitator mapping users to independent immigration experts. By utilizing this infrastructure, all liability regarding professional outcomes fundamentally resides outside the core platform jurisdiction.
                 </p>
               </div>
             </div>

          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
