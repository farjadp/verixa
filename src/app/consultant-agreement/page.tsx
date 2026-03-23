import { FileSignature, ShieldAlert, Scale, CheckCircle, Ban } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Consultant Agreement | Verixa",
  description: "Verixa Consultant Agreement - Platform Operating Terms and Supply-Side Liability",
};

export default function ConsultantAgreementPage() {
  return (
    <main className="min-h-screen bg-[#F5F7FA] font-sans selection:bg-[#2FA4A9] selection:text-white">
      <Header />
      <div className="pt-32 pb-20">
        
        {/* HEADER SECTION */}
        <div className="max-w-4xl mx-auto px-6 lg:px-8 mb-16">
          <div className="flex items-center gap-3 text-[#0F2A44] font-bold tracking-widest uppercase text-sm mb-4">
            <FileSignature className="w-5 h-5" />
            <span>Supply-Side Legal Infrastructure</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-black text-[#0F2A44] tracking-tight mb-6 font-serif">
            Verixa Consultant Agreement
          </h1>
          <p className="text-lg text-gray-500 font-medium flex items-center gap-3">
            Effective Date: <span className="text-[#0F2A44] font-bold">March 23, 2026</span>
          </p>
        </div>

        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 p-8 lg:p-14 text-gray-600">
            
            {/* 1. Parties */}
            <section className="space-y-4 mb-12">
              <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
                <span className="text-[#2FA4A9]">1.</span> Parties
              </h2>
              <p className="text-[15px] leading-relaxed">
                This Consultant Agreement (“Agreement”) is entered into between <strong>Verixa Inc. (“Platform”)</strong> and the individual or entity registering as a consultant <strong>(“Consultant”)</strong>.
              </p>
            </section>

            <hr className="border-gray-100 mb-12" />

            {/* 2. Nature of Relationship */}
            <section className="space-y-8 mb-12">
              <h2 className="text-2xl font-bold text-red-700 flex items-center gap-2">
                <span className="text-red-500">2.</span> Nature of Relationship (CRITICAL)
              </h2>
              
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6">
                <p className="text-[14px] font-bold text-[#0F2A44] mb-3">The Consultant acknowledges that:</p>
                <ul className="list-none pl-0 space-y-3 text-[14px]">
                  <li className="flex gap-3"><div className="w-2 h-2 rounded-full bg-[#2FA4A9] shrink-0 mt-1.5" /> They are an independent professional</li>
                  <li className="flex gap-3"><div className="w-2 h-2 rounded-full bg-[#2FA4A9] shrink-0 mt-1.5" /> They are <strong>not</strong> an employee, agent, or representative of Verixa</li>
                  <li className="flex gap-3"><div className="w-2 h-2 rounded-full bg-[#2FA4A9] shrink-0 mt-1.5" /> They act solely in their own professional capacity</li>
                </ul>
              </div>
              
              <div className="bg-[#1A1F2B] p-8 rounded-3xl border border-[#0F2A44] text-white shadow-xl relative overflow-hidden">
                <Scale className="absolute top-0 right-0 p-4 w-32 h-32 text-white opacity-5" />
                <h4 className="text-xl font-black text-amber-400 mb-4 flex items-center gap-3">
                  ⚠️ Legal Position
                </h4>
                <div className="space-y-4">
                  <p className="text-[15px] font-bold">Verixa explicitly:</p>
                  <ul className="text-[14px] list-none pl-0 space-y-3 font-medium text-gray-300">
                    <li className="flex items-center gap-3"><Ban className="w-4 h-4 text-amber-400 shrink-0"/> Does NOT provide immigration advice</li>
                    <li className="flex items-center gap-3"><Ban className="w-4 h-4 text-amber-400 shrink-0"/> Does NOT supervise or control Consultant services</li>
                    <li className="flex items-center gap-3"><Ban className="w-4 h-4 text-amber-400 shrink-0"/> Does NOT assume responsibility for Consultant actions</li>
                  </ul>
                </div>
              </div>
            </section>

            <hr className="border-gray-100 mb-12" />

            {/* 3 & 4 */}
            <div className="grid md:grid-cols-2 gap-10 mb-12">
              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
                  <span className="text-[#2FA4A9]">3.</span> Eligibility & Licensing
                </h2>
                <p className="text-[14px] mb-2 font-bold">The Consultant represents and warrants that:</p>
                <ul className="list-disc pl-5 space-y-1 text-[14px]">
                  <li>They hold a valid license (e.g., RCIC or applicable authority)</li>
                  <li>Their license is active and in good standing</li>
                  <li>They will comply with all applicable laws and regulations</li>
                </ul>
                <div className="bg-gray-50 border p-3 rounded-lg mt-3 text-xs text-gray-500">
                  <strong className="text-gray-800">Verification:</strong> Verixa may verify license status, request documentation, and suspend access if discrepancies are found.
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
                  <span className="text-[#2FA4A9]">4.</span> Profile Accuracy
                </h2>
                <p className="text-[14px] font-bold mb-2">The Consultant agrees to:</p>
                <ul className="list-disc pl-5 space-y-1 text-[14px]">
                  <li>Provide accurate and up-to-date information</li>
                  <li>Not misrepresent qualifications or experience</li>
                  <li>Update profile information when changes occur</li>
                </ul>
                <div className="bg-red-50 border border-red-100 p-3 rounded-lg mt-3 text-xs text-red-800">
                  False or misleading information may result in immediate suspension or removal from the platform.
                </div>
              </section>
            </div>

            <hr className="border-gray-100 mb-12" />

            {/* 5. Services Provided */}
            <section className="space-y-6 mb-12">
              <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
                <span className="text-[#2FA4A9]">5.</span> Services Provided
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white p-5 border shadow-sm rounded-xl">
                  <p className="text-[14px] font-medium text-gray-900 border-b pb-2 mb-3">All professional services:</p>
                  <ul className="text-[14px] list-disc pl-5 space-y-2 marker:text-[#2FA4A9]">
                    <li>Are provided directly by the Consultant</li>
                    <li>Are completely independent of Verixa</li>
                  </ul>
                </div>
                <div className="bg-white p-5 border shadow-sm rounded-xl border-l-[4px] border-l-red-500">
                  <p className="text-[14px] font-medium text-gray-900 border-b pb-2 mb-3">The Consultant is solely responsible for:</p>
                  <ul className="text-[14px] list-disc pl-5 space-y-2 marker:text-red-500 font-bold text-red-700">
                    <li>Advice provided</li>
                    <li>Legal compliance</li>
                    <li>Client outcomes</li>
                  </ul>
                </div>
              </div>
            </section>

            <hr className="border-gray-100 mb-12" />

            {/* 6. Booking & Client Interaction */}
            <section className="space-y-6 mb-12">
              <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
                <span className="text-[#2FA4A9]">6.</span> Booking & Client Interaction
              </h2>
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="bg-gray-50 border p-5 rounded-2xl">
                  <h4 className="font-bold text-[#0F2A44] mb-2 text-sm">6.1 Booking Acceptance</h4>
                  <ul className="text-sm list-disc pl-4 space-y-1 text-gray-600">
                    <li>Accept or decline booking requests</li>
                    <li>Set availability and pricing autonomously</li>
                  </ul>
                </div>
                <div className="bg-gray-50 border p-5 rounded-2xl">
                  <h4 className="font-bold text-[#0F2A44] mb-2 text-sm">6.2 Communication</h4>
                  <ul className="text-sm list-disc pl-4 space-y-1 text-gray-600">
                    <li>Communicate professionally</li>
                    <li>Respond within reasonable time</li>
                    <li>Provide accurate info</li>
                  </ul>
                </div>
                <div className="bg-gray-50 border p-5 rounded-2xl border-b-4 border-b-[#0F2A44]">
                  <h4 className="font-bold text-[#0F2A44] mb-2 text-sm">6.3 Client Responsibility</h4>
                  <p className="text-xs text-gray-600 mb-2 font-bold">The Consultant acknowledges that:</p>
                  <ul className="text-xs list-disc pl-4 space-y-1 text-gray-600">
                    <li>Clients rely on their professional expertise</li>
                    <li>They must act in accordance with regulatory standards</li>
                  </ul>
                </div>
              </div>
            </section>

            <hr className="border-gray-100 mb-12" />

            {/* 7. Fees, 8. Cancellations, 9. Reviews */}
            <div className="grid lg:grid-cols-2 gap-10 mb-12">
              <section className="space-y-6">
                <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
                  <span className="text-[#2FA4A9]">7.</span> Fees & Payments
                </h2>
                <div className="space-y-4">
                  <div className="border border-gray-100 rounded-lg p-4">
                    <h5 className="font-bold text-sm text-[#0F2A44] mb-1">7.1 Platform Fees</h5>
                    <p className="text-[13px]">Verixa may charge booking commissions, service fees, or premium visibility subscription fees.</p>
                  </div>
                  <div className="border border-gray-100 rounded-lg p-4">
                    <h5 className="font-bold text-sm text-[#0F2A44] mb-1">7.2 Payment Processing</h5>
                    <p className="text-[13px] mb-2">Payments handled through third-party providers (e.g., Stripe).</p>
                    <p className="text-[12px] bg-gray-50 p-2 rounded text-gray-500">The Consultant agrees Verixa may deduct platform fees before payout. Timing may depend on booking status.</p>
                  </div>
                  <div className="border border-amber-100 bg-amber-50 rounded-lg p-4">
                    <h5 className="font-bold text-sm text-[#0F2A44] mb-1">7.3 Escrow / Hold Model</h5>
                    <p className="text-[13px] text-amber-900">Funds may be held until booking confirmation and released upon completion or acceptance.</p>
                  </div>
                </div>
              </section>

              <div className="space-y-10">
                <section className="space-y-4">
                  <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
                    <span className="text-[#2FA4A9]">8.</span> Cancellations & Refunds
                  </h2>
                  <p className="text-[14px]">Consultants must define robust cancellation policies and honor agreed upon logistics.</p>
                  <div className="bg-gray-50 p-3 rounded border text-[13px] font-medium">
                    Verixa may intervene in disputes, issue refunds, or adjust payments at its reasonable discretion.
                  </div>
                </section>

                <section className="space-y-4">
                  <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
                    <span className="text-[#2FA4A9]">9.</span> Reviews & Reputation
                  </h2>
                  <ul className="text-[14px] list-disc pl-5 space-y-1 marker:text-[#2FA4A9]">
                    <li>Users may leave reviews based on experiences</li>
                    <li>Reviews reflect user sentiment</li>
                  </ul>
                  <p className="text-xs text-gray-500 italic mt-2">Verixa may moderate content or remove abusive/false reviews.</p>
                </section>
              </div>
            </div>

            <hr className="border-gray-100 mb-12" />

            {/* 10. Prohibited Conduct */}
            <section className="space-y-4 mb-12">
              <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
                <span className="text-[#2FA4A9]">10.</span> Prohibited Conduct
              </h2>
              <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
                <p className="text-sm font-bold text-red-900 mb-3">Consultants must NOT:</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <ul className="text-sm list-none pl-0 space-y-2 font-medium text-red-800">
                    <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5" /> Provide false credentials</li>
                    <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5" /> Impersonate others</li>
                    <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5" /> Manipulate reviews</li>
                  </ul>
                  <ul className="text-sm list-none pl-0 space-y-2 font-medium text-red-800">
                    <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5" /> Engage in fraud or payment abuse</li>
                    <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5" /> Solicit payments outside the platform (if restricted)</li>
                  </ul>
                </div>
                <p className="text-xs font-bold text-red-900 mt-4 border-t border-red-200 pt-3 uppercase tracking-wider">
                  Violation WILL result in suspension, termination, or legal action.
                </p>
              </div>
            </section>

            <hr className="border-gray-100 mb-12" />

            {/* 11, 12, 13 */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <section className="bg-gray-50 p-6 rounded-2xl border">
                <h4 className="font-bold text-[#0F2A44] mb-3 text-lg text-[#2FA4A9]">11. Intellectual Property</h4>
                <p className="text-xs text-gray-600 mb-3">Consultants retain ownership of their profile content.</p>
                <p className="text-xs text-gray-600">However, they grant Verixa a license to display, distribute, and promote such content within the platform framework.</p>
              </section>

              <section className="bg-gray-50 p-6 rounded-2xl border border-b-4 border-b-[#0F2A44]">
                <h4 className="font-bold text-[#0F2A44] mb-3 text-lg text-[#2FA4A9]">12. Data Privacy</h4>
                <p className="text-xs text-gray-600 mb-2">Consultants agree to:</p>
                <ul className="text-xs list-disc pl-4 space-y-1 mb-3 text-gray-800 font-medium">
                  <li>Comply with privacy laws (PIPEDA)</li>
                  <li>Protect client information</li>
                  <li>Not misuse personal data</li>
                </ul>
                <a href="https://laws-lois.justice.gc.ca/eng/acts/P-8.6/" target="_blank" rel="noreferrer" className="text-[10px] text-gray-400 hover:text-[#2FA4A9] transition">📌 PIPEDA Ref</a>
              </section>

              <section className="bg-gray-50 p-6 rounded-2xl border">
                <h4 className="font-bold text-[#0F2A44] mb-3 text-lg text-[#2FA4A9]">13. Confidentiality</h4>
                <p className="text-xs text-gray-600 mb-2">Consultants must:</p>
                <ul className="text-xs list-disc pl-4 space-y-1 text-gray-800 font-medium">
                  <li>Keep client information perfectly confidential</li>
                  <li>Use information purely for its intended professional purposes</li>
                </ul>
              </section>
            </div>

            <hr className="border-gray-100 mb-12" />

            {/* 14 LIMITATION OF LIABILITY MANTRA */}
            <div className="bg-white border-2 border-red-100 p-8 lg:p-10 rounded-3xl shadow-xl mb-12">
              <h2 className="text-2xl font-black text-[#0F2A44] flex items-center gap-2 mb-4">
                <span className="text-red-500">14.</span> Limitation of Liability (CRITICAL)
              </h2>
              <p className="text-[15px] font-bold text-red-600 uppercase tracking-wide mb-4">To the fullest extent permitted by law:</p>
              <div className="bg-[#F5F7FA] border border-gray-200 p-6 rounded-2xl">
                <p className="text-[15px] text-gray-800 mb-3 font-bold">Verixa is NOT liable for:</p>
                <ul className="text-[15px] list-none pl-0 space-y-3 font-medium text-gray-600">
                  <li className="flex gap-2 items-center"><Ban className="w-4 h-4 text-red-500"/> Consultant services</li>
                  <li className="flex gap-2 items-center"><Ban className="w-4 h-4 text-red-500"/> Advice provided</li>
                  <li className="flex gap-2 items-center"><Ban className="w-4 h-4 text-red-500"/> Client outcomes</li>
                  <li className="flex gap-2 items-center"><Ban className="w-4 h-4 text-red-500"/> Disputes between Consultant and User</li>
                </ul>
              </div>
            </div>

            <hr className="border-gray-100 mb-12" />

            {/* 15, 16, 17, 18. Wrap up logistics */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
               <div className="space-y-2">
                 <h4 className="font-bold text-[#0F2A44]">15. Indemnification</h4>
                 <p className="text-xs text-gray-600">The Consultant agrees to indemnify and hold harmless Verixa from claims arising from their services, regulatory violations, and client disputes.</p>
               </div>
               <div className="space-y-2">
                 <h4 className="font-bold text-[#0F2A44]">16. Suspension / Term.</h4>
                 <p className="text-xs text-gray-600">Access may be terminated if terms are violated, licenses expire, fraud is detected, or legal risk arises.</p>
               </div>
               <div className="space-y-2">
                 <h4 className="font-bold text-[#0F2A44]">17. Platform Control</h4>
                 <p className="text-xs text-gray-600">Verixa reserves the right to modify platform features, adjust visibility algorithms, and update pricing structures.</p>
               </div>
               <div className="space-y-2">
                 <h4 className="font-bold text-[#0F2A44]">18. No Exclusivity</h4>
                 <p className="text-xs text-gray-600">Consultants may operate independently and use other platforms. Verixa does not impose exclusivity without explicit agreement.</p>
               </div>
             </div>

             <hr className="border-gray-100 mb-12" />

             {/* 19, 20, 21, 22. Formal Jurisdiction */}
             <div className="grid md:grid-flow-col gap-6 mb-6">
                <section className="bg-gray-50 border p-5 rounded-2xl">
                  <h4 className="font-bold text-[#0F2A44] mb-2 text-sm">19. Governing Law</h4>
                  <p className="text-sm font-bold text-[#2FA4A9] bg-white px-3 py-2 rounded border">Province of Ontario, Canada</p>
                  <p className="text-[10px] mt-2 text-gray-500">and applicable federal laws.</p>
                </section>
                
                <section className="bg-gray-50 border p-5 rounded-2xl">
                  <h4 className="font-bold text-[#0F2A44] mb-2 text-sm">20. Dispute Resolut.</h4>
                  <p className="text-[11px] text-gray-600">Disputes resolved via platform comms. Verixa may offer mediation but is not obligated.</p>
                </section>

                <section className="bg-gray-50 border p-5 rounded-2xl">
                  <h4 className="font-bold text-[#0F2A44] mb-2 text-sm">21. Amendments</h4>
                  <p className="text-[11px] text-gray-600">Verixa may update this Agreement. Continued use constitutes acceptance.</p>
                </section>
                
                <section className="bg-gray-50 border p-5 rounded-2xl">
                  <h4 className="font-bold text-[#0F2A44] mb-2 text-sm">22. Contact Details</h4>
                  <p className="text-xs font-medium mt-1">Email: <em>legal@verixa.com</em></p>
                  <p className="text-xs font-medium">Platform support</p>
                </section>
             </div>

             {/* THE SUPPLY SIDE MANTRA */}
             <div className="mt-20 lg:mt-24">
               <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#1A1F2B] via-[#0F2A44] to-amber-900/80 p-10 lg:p-16 text-center shadow-2xl border border-amber-500/20">
                 {/* Internal lighting */}
                 <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500 opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                 
                 <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-6" />
                 
                 <h2 className="relative z-10 text-3xl md:text-5xl lg:text-6xl font-black text-white tracking-tight mb-8 drop-shadow-xl font-serif">
                   “Consultants deliver.<br/>Verixa enables.”
                 </h2>
                 <p className="relative z-10 text-amber-100/80 font-medium text-lg max-w-2xl mx-auto tracking-wide border-t border-amber-500/20 pt-6">
                   Verixa controls the digital infrastructure. The Consultant commands the immigration outcome. Under no circumstance does platform facilitation equalize to professional liability.
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
