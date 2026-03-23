import { CreditCard, ShieldAlert, BadgeInfo, Scale, Ban } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Booking & Refund Policy | Verixa",
  description: "Verixa Booking & Refund Policy - Escrow constraints, cancellation rules, and financial resolution standards.",
};

export default function RefundPolicyPage() {
  return (
    <main className="min-h-screen bg-[#F5F7FA] font-sans selection:bg-[#2FA4A9] selection:text-white">
      <Header />
      <div className="pt-32 pb-20">
        
        {/* HEADER SECTION */}
        <div className="max-w-4xl mx-auto px-6 lg:px-8 mb-16">
          <div className="flex items-center gap-3 text-[#0F2A44] font-bold tracking-widest uppercase text-sm mb-4">
            <CreditCard className="w-5 h-5" />
            <span>Financial & Operational Legalities</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-black text-[#0F2A44] tracking-tight mb-6 font-serif">
            Booking & Refund Policy
          </h1>
          <p className="text-lg text-gray-500 font-medium flex items-center gap-3">
            Effective Date: <span className="text-[#0F2A44] font-bold">March 23, 2026</span>
          </p>
        </div>

        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 p-8 lg:p-14 text-gray-600">
            
            {/* 1. Overview */}
            <section className="space-y-4 mb-12">
              <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
                <span className="text-[#2FA4A9]">1.</span> Overview
              </h2>
              <p className="text-[15px] leading-relaxed">
                This Booking & Refund Policy governs how consultations are booked, paid, cancelled, and refunded on Verixa. By booking a consultation, users explicitly agree to this strict operational directive.
              </p>
            </section>

            <hr className="border-gray-100 mb-12" />

            {/* 2. Nature of Booking */}
            <section className="space-y-8 mb-12">
              <h2 className="text-2xl font-bold text-red-700 flex items-center gap-2">
                <span className="text-red-500">2.</span> Nature of Booking (CRITICAL)
              </h2>
              <p className="text-[15px]">Verixa strictly acts as a platform facilitating bookings between Users (“Clients”) and Independent Professionals (“Consultants”).</p>
              
              <div className="bg-[#1A1F2B] p-8 rounded-3xl border border-[#0F2A44] text-white shadow-xl relative overflow-hidden">
                <ShieldAlert className="absolute top-0 right-0 p-4 w-32 h-32 text-red-500 opacity-10" />
                <h4 className="text-xl font-black text-amber-400 mb-5 flex items-center gap-3">
                  ⚠️ Important Legal Status
                </h4>
                <ul className="text-[16px] list-none pl-0 space-y-4 font-bold text-gray-200">
                  <li className="flex items-center gap-3"><Ban className="w-5 h-5 text-amber-400 shrink-0"/> Verixa does NOT provide the consultation</li>
                  <li className="flex items-center gap-3"><Ban className="w-5 h-5 text-amber-400 shrink-0"/> Verixa does NOT control the advice given</li>
                  <li className="flex items-center gap-3"><Ban className="w-5 h-5 text-amber-400 shrink-0"/> The booking is a direct contract between Client and Consultant</li>
                </ul>
              </div>
            </section>

            <hr className="border-gray-100 mb-12" />

            {/* 3. Booking Process */}
            <section className="space-y-6 mb-12">
              <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
                <span className="text-[#2FA4A9]">3.</span> Booking Process & Status
              </h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6">
                  <h4 className="font-bold text-[#0F2A44] mb-4">The Complete Funnel:</h4>
                  <ol className="list-decimal pl-5 space-y-2 text-[14px]">
                    <li>Client selects a consultant</li>
                    <li>Client chooses time and service</li>
                    <li>Client submits booking request</li>
                    <li className="font-bold text-[#2FA4A9]">Payment authorization placed</li>
                    <li>Consultant accepts or declines</li>
                  </ol>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-[#0F2A44] border-b pb-2 mb-3">Status Dictionary</h4>
                  <ul className="text-[13px] space-y-2">
                    <li className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-400"/> <strong>Pending</strong>: Waiting for consultant</li>
                    <li className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"/> <strong>Confirmed</strong>: Accepted by consultant</li>
                    <li className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-400"/> <strong>Declined</strong>: Rejected by consultant</li>
                    <li className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gray-400"/> <strong>Cancelled</strong>: Cancelled by either party</li>
                    <li className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"/> <strong>Completed</strong>: Session finished</li>
                    <li className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-black"/> <strong>No-show</strong>: One party did not attend</li>
                  </ul>
                </div>
              </div>
            </section>

            <hr className="border-gray-100 mb-12" />

            {/* 4. Payment & Authorization */}
            <section className="space-y-6 mb-12">
              <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
                <span className="text-[#2FA4A9]">4.</span> Payment & Escrow Holds
              </h2>
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="bg-white border rounded-xl p-5 shadow-sm space-y-2">
                  <h4 className="font-bold text-[#0F2A44] border-b pb-2">4.1 Processing</h4>
                  <p className="text-xs text-gray-600 mb-2">Handled via third parties (e.g., Stripe).</p>
                  <p className="text-[11px] font-bold text-green-700 bg-green-50 p-2 rounded">Verixa does NOT store full card details or CVV.</p>
                </div>
                <div className="bg-white border rounded-xl p-5 shadow-sm space-y-2 border-t-4 border-t-[#2FA4A9]">
                  <h4 className="font-bold text-[#0F2A44] border-b pb-2">4.2 Hold Model</h4>
                  <ul className="text-xs text-gray-600 list-disc pl-4 space-y-1">
                    <li>A temporary hold is placed at checkout.</li>
                    <li>Funds are captured ONLY after consultant accepts.</li>
                  </ul>
                </div>
                <div className="bg-white border rounded-xl p-5 shadow-sm space-y-2">
                  <h4 className="font-bold text-[#0F2A44] border-b pb-2">4.3 Platform Fees</h4>
                  <ul className="text-xs text-gray-600 list-disc pl-4 space-y-1">
                    <li>Verixa may deduct booking commission/fees.</li>
                    <li>Fees are strictly disclosed prior to payment entry.</li>
                  </ul>
                </div>
              </div>
            </section>

            <hr className="border-gray-100 mb-12" />

            {/* 5. Acceptance & Decline */}
            <section className="space-y-4 mb-12">
              <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
                <span className="text-[#2FA4A9]">5.</span> Consultant Acceptance
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-green-50/50 border border-green-100 p-5 rounded-xl">
                  <p className="font-bold text-green-800 mb-2">✅ If Consultant Accepts:</p>
                  <ul className="list-disc pl-5 text-sm marker:text-green-500 text-green-900">
                    <li>Booking becomes Confirmed immediately.</li>
                    <li>Payment hold is captured definitively.</li>
                  </ul>
                </div>
                <div className="bg-gray-50 border border-gray-200 p-5 rounded-xl">
                  <p className="font-bold text-gray-800 mb-2">❌ If Consultant Declines:</p>
                  <ul className="list-disc pl-5 text-sm text-gray-600">
                    <li>Booking is cancelled.</li>
                    <li>Payment hold is released automatically (voided).</li>
                  </ul>
                </div>
              </div>
            </section>

            <hr className="border-gray-100 mb-12" />

            {/* 6. Cancellation Policy Matrix */}
            <section className="space-y-8 mb-12">
              <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
                <span className="text-[#2FA4A9]">6.</span> Cancellation Matrix
              </h2>

              <div className="space-y-4">
                <h4 className="text-lg font-bold text-[#0F2A44] bg-gray-50 border p-4 rounded-xl mb-4">6.1 Client Cancellation</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="border border-green-200 p-5 rounded-xl">
                    <p className="text-sm font-bold text-green-800 mb-1">More than 24-48 Hours Before</p>
                    <p className="text-[13px] text-gray-600">Full refund granted (minus processing fees if dictated by gateway).</p>
                  </div>
                  <div className="border border-red-200 p-5 rounded-xl">
                    <p className="text-sm font-bold text-red-800 mb-1">Within 24 Hours Before</p>
                    <p className="text-[13px] text-gray-600">Partial or absolutely NO refund granted, depending directly on the consultant's individual configuration policy.</p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 pt-4">
                <div className="border border-gray-100 p-5 rounded-xl">
                  <h4 className="font-bold text-[#0F2A44] mb-2">6.2 Consultant Cancellation</h4>
                  <ul className="text-[13px] list-disc pl-4 text-gray-600 space-y-1">
                    <li>Client will receive a <strong>Full Refund</strong></li>
                    <li>OR Priority Rescheduling access.</li>
                  </ul>
                </div>
                <div className="border border-red-100 bg-red-50 p-5 rounded-xl">
                  <h4 className="font-bold text-red-900 mb-2">6.3 Platform-Initiated</h4>
                  <p className="text-[13px] text-red-800">Verixa may cancel bookings unilaterally in cases of suspected fraud, compliance concerns, or technical hazards.</p>
                </div>
              </div>
            </section>

            <hr className="border-gray-100 mb-12" />

            {/* 7. No-Show Policy */}
            <section className="space-y-6 mb-12">
              <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
                <span className="text-[#2FA4A9]">7.</span> No-Show Logistics
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-50 border p-5 rounded-2xl flex items-start gap-4">
                  <BadgeInfo className="w-6 h-6 text-gray-400 shrink-0" />
                  <div>
                    <h4 className="font-bold text-gray-800 mb-1">7.1 Client No-Show</h4>
                    <p className="text-sm text-gray-600">If the client fails to attend, <strong>no refund will be issued</strong> and the booking is definitively marked as "No-show".</p>
                  </div>
                </div>
                <div className="bg-gray-50 border p-5 rounded-2xl flex items-start gap-4">
                  <BadgeInfo className="w-6 h-6 text-[#2FA4A9] shrink-0" />
                  <div>
                    <h4 className="font-bold text-gray-800 mb-1">7.2 Consultant No-Show</h4>
                    <p className="text-sm text-gray-600">If the consultant fails to attend, the client is eligible for a <strong>Full Refund</strong> or Priority Rebooking.</p>
                  </div>
                </div>
              </div>
            </section>

            <hr className="border-gray-100 mb-12" />

            {/* 8. Refund Integrity */}
            <section className="space-y-8 mb-12">
              <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2 border-b pb-4">
                <span className="text-[#2FA4A9]">8.</span> Refund Integrity & Final Authority
              </h2>
              
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <h4 className="font-bold text-[#0F2A44]">8.1 General Rule</h4>
                  <p className="text-[13px] text-gray-600">Refunds are rigidly granted based on the timing of cancellation, absolute responsibility (client vs consultant), and final platform discretion.</p>
                </div>
                
                <div className="space-y-2 border-l border-r px-4 border-gray-100">
                  <h4 className="font-bold text-red-600 flex items-center gap-2"><Ban className="w-3 h-3"/> 8.2 Non-Refundable</h4>
                  <ul className="text-[12px] list-disc pl-4 text-gray-600 space-y-1">
                    <li>Session was completely executed</li>
                    <li>Client was a no-show</li>
                    <li>Dissatisfaction without valid regulatory cause</li>
                    <li>Platform manipulation or misuse</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-[#0F2A44]">8.3 Disputed Cases</h4>
                  <p className="text-[12px] text-gray-600 bg-gray-50 p-2 rounded">Verixa reviews communication logs, booking metadata, and mutual evidence to issue full, partial, or ZERO refunds at its sole reasonable discretion.</p>
                </div>
              </div>
            </section>

            <hr className="border-gray-100 mb-12" />

            {/* 9 & 10 */}
            <div className="grid md:grid-cols-2 gap-10 mb-12">
              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-red-700 flex items-center gap-2">
                  <span className="text-red-500">9.</span> Service Quality Disclaimer
                </h2>
                <div className="bg-red-50/50 p-5 rounded-2xl border border-red-100">
                  <p className="text-sm font-bold text-red-900 mb-2">Verixa explicitly does NOT guarantee:</p>
                  <ul className="list-disc pl-5 text-[13px] text-red-800 space-y-1">
                    <li>Quality of consultation</li>
                    <li>Outcome of professional advice</li>
                    <li>Immigration or regulatory results</li>
                  </ul>
                  <p className="text-[12px] font-bold text-red-900 border-t border-red-200 pt-3 mt-3">All services are strictly and independently provided by the licensed professionals.</p>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
                  <span className="text-[#2FA4A9]">10.</span> Rescheduling Constraints
                </h2>
                <div className="bg-gray-50 p-5 rounded-2xl border">
                  <p className="text-sm font-bold text-gray-900 mb-2">Rescheduling is strictly subject to:</p>
                  <ul className="list-disc pl-5 text-[13px] text-gray-600 space-y-1">
                    <li>Consultant real-time availability</li>
                    <li>Timing of the modification request</li>
                  </ul>
                  <p className="text-[12px] font-medium text-gray-500 bg-white p-2 mt-3 rounded shadow-sm">Warning: Late rescheduling requests may be automatically treated as a complete cancellation under Section 6.1.</p>
                </div>
              </section>
            </div>

            <hr className="border-gray-100 mb-12" />

             {/* 11, 12, 13, 14, 15, 16 Wrap up */}
             <div className="grid md:grid-cols-3 gap-6 mb-12">
               <div className="space-y-2">
                 <h4 className="font-bold text-[#0F2A44] text-[15px]">11. Delay Limits</h4>
                 <p className="text-[13px] text-gray-600">Refund processing time defaults to <strong>5 to 10 business days</strong> depending on banking network protocols and Stripe API.</p>
               </div>
               <div className="space-y-2">
                 <h4 className="font-bold text-[#0F2A44] text-[15px]">12. Abuse Protection</h4>
                 <p className="text-[13px] text-gray-600">Verixa systematically blocks suspicious velocity transactions, cancels fraudulent bookings, and terminates toxic accounts.</p>
               </div>
               <div className="space-y-2">
                 <h4 className="font-bold text-[#0F2A44] text-[15px]">13. Edge Liability</h4>
                 <p className="text-[13px] text-gray-600">Verixa drops ALL liability for missed sessions, subjective dissatisfaction, or subsequent financial damages arising from sessions.</p>
               </div>
             </div>

             <div className="grid md:grid-flow-col gap-6 mb-6">
                <section className="bg-gray-50 border p-5 rounded-2xl">
                  <h4 className="font-bold text-[#0F2A44] mb-2 text-sm">14. Federal Compliance</h4>
                  <p className="text-xs text-gray-600 mb-2">This policy guarantees alignment with PIPEDA parameters and Canadian consumer protection statutes.</p>
                  <a href="https://laws-lois.justice.gc.ca/eng/acts/P-8.6/" target="_blank" rel="noreferrer" className="text-[10px] bg-white px-2 py-1 rounded shadow-sm text-gray-500">PIPEDA Record</a>
                </section>

                <section className="bg-gray-50 border p-5 rounded-2xl">
                  <h4 className="font-bold text-[#0F2A44] mb-2 text-sm">15. Modifications</h4>
                  <p className="text-[11px] text-gray-600">Verixa may alter transaction models. Continued monetary use signifies automated acceptance.</p>
                </section>
                
                <section className="bg-gray-50 border p-5 rounded-2xl">
                  <h4 className="font-bold text-[#0F2A44] mb-2 text-sm">16. Resolution Contact</h4>
                  <p className="text-xs font-medium mt-1">Email: <em>finance@verixa.com</em></p>
                  <p className="text-xs font-medium">Dashboard Support Terminal</p>
                </section>
             </div>

             {/* THE FINANCIAL MANTRA */}
             <div className="mt-20 lg:mt-24">
               <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#0F2A44] via-[#0D1B2A] to-emerald-900/60 p-10 lg:p-16 text-center shadow-2xl border border-emerald-500/20">
                 {/* Internal lighting */}
                 <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500 opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                 
                 <Scale className="w-12 h-12 text-emerald-500/80 mx-auto mb-6" />
                 
                 <h2 className="relative z-10 text-3xl md:text-5xl lg:text-7xl font-black text-white tracking-tight mb-8 drop-shadow-xl font-serif">
                   “Clarity kills conflict.”
                 </h2>
                 <p className="relative z-10 text-emerald-100/70 font-medium text-lg max-w-2xl mx-auto tracking-wide border-t border-emerald-500/20 pt-6">
                   Verixa protects capital, mitigates disputes, and enforces absolute expectations. Trust scales when both sides operate strictly within a defined financial boundary.
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
