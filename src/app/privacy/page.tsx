import { ShieldCheck, Scale, FileText } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | Verixa",
  description: "Verixa Privacy & Data Protection Policy - Legal Foundation & Core Principles",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#F5F7FA] py-20 font-sans selection:bg-[#2FA4A9] selection:text-white">
      
      {/* HEADER SECTION */}
      <div className="max-w-4xl mx-auto px-6 lg:px-8 mb-16">
        <div className="flex items-center gap-3 text-[#2FA4A9] font-bold tracking-widest uppercase text-sm mb-4">
          <ShieldCheck className="w-5 h-5" />
          <span>Compliance & Security</span>
        </div>
        <h1 className="text-4xl lg:text-5xl font-black text-[#0F2A44] tracking-tight mb-6 font-serif">
          Verixa Privacy & Data Protection Policy
        </h1>
        <p className="text-xl text-gray-500 font-medium">
          Part 1 — Legal Foundation & Core Principles
        </p>
      </div>

      {/* CONTENT SECTION */}
      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 p-8 lg:p-14 text-gray-600 space-y-12">
          
          {/* 1. Introduction */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
              <span className="text-[#2FA4A9]">1.</span> Introduction
            </h2>
            <div className="prose prose-gray max-w-none text-gray-600 leading-relaxed text-[15px]">
              <p>
                Verixa (“we”, “our”, or “the Platform”) is committed to protecting the privacy, confidentiality, and security of personal information in compliance with applicable Canadian laws, including but not limited to:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-4 marker:text-[#2FA4A9]">
                <li><strong>Personal Information Protection and Electronic Documents Act (PIPEDA)</strong></li>
                <li>Digital Charter Implementation Act (Bill C-27 – where applicable updates may apply)</li>
                <li>Applicable provincial privacy laws where relevant (e.g., Quebec Law 25)</li>
              </ul>
              <p className="mt-4">
                This policy explains how we collect, use, disclose, and safeguard personal information when users interact with the Verixa platform.
              </p>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* 2. Scope of This Policy */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
              <span className="text-[#2FA4A9]">2.</span> Scope of This Policy
            </h2>
            <div className="prose prose-gray max-w-none text-gray-600 leading-relaxed text-[15px]">
              <p>This policy applies to:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4 marker:text-[#2FA4A9]">
                <li><strong>Users</strong> (clients seeking immigration consulting services)</li>
                <li><strong>Consultants</strong> (RCICs or related professionals)</li>
                <li><strong>Visitors</strong> browsing the platform</li>
                <li>Any individual interacting with Verixa services, content, or communications</li>
              </ul>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* 3. Legal Basis */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
              <span className="text-[#2FA4A9]">3.</span> Legal Basis (PIPEDA Compliance)
            </h2>
            <div className="prose prose-gray max-w-none text-gray-600 leading-relaxed text-[15px]">
              <p>Verixa operates under the principles established in PIPEDA, specifically:</p>
              
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 mt-6">
                <h3 className="text-lg font-bold text-[#0F2A44] mb-4 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-[#2FA4A9]" />
                  10 Fair Information Principles (Schedule 1 of PIPEDA)
                </h3>
                <p className="mb-4">We explicitly align with:</p>
                <ol className="list-decimal pl-5 space-y-1 font-medium text-gray-700 marker:text-gray-400">
                  <li>Accountability</li>
                  <li>Identifying Purposes</li>
                  <li>Consent</li>
                  <li>Limiting Collection</li>
                  <li>Limiting Use, Disclosure, and Retention</li>
                  <li>Accuracy</li>
                  <li>Safeguards</li>
                  <li>Openness</li>
                  <li>Individual Access</li>
                  <li>Challenging Compliance</li>
                </ol>
              </div>

              <div className="mt-6 text-sm bg-[#0F2A44]/5 text-[#0F2A44] px-4 py-3 rounded-xl border border-[#0F2A44]/10">
                <strong>📌 Reference:</strong> PIPEDA, Schedule 1 - <a href="https://laws-lois.justice.gc.ca/eng/acts/P-8.6/" target="_blank" rel="noreferrer" className="underline hover:text-[#2FA4A9]">View on laws-lois.justice.gc.ca</a>
              </div>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* 4. Definitions */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
              <span className="text-[#2FA4A9]">4.</span> Definitions
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Personal Info */}
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-4">
                <h3 className="text-lg font-bold text-[#0F2A44]">Personal Information</h3>
                <p className="text-sm italic text-gray-500">Under PIPEDA: "Information about an identifiable individual"</p>
                <ul className="text-sm list-disc pl-5 space-y-1 marker:text-[#2FA4A9]">
                  <li>Name</li>
                  <li>Email address</li>
                  <li>Phone number</li>
                  <li>IP address (in some contexts)</li>
                  <li>Booking details</li>
                  <li>Communication history</li>
                </ul>
                <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">📌 Ref: PIPEDA Section 2(1)</div>
              </div>

              {/* Sensitive Info */}
              <div className="bg-red-50 p-6 rounded-2xl border border-red-100 space-y-4">
                <h3 className="text-lg font-bold text-red-900 border-b border-red-200 pb-2">Sensitive Information</h3>
                <p className="text-sm text-red-800">Certain information is considered more sensitive depending on context:</p>
                <ul className="text-sm list-disc pl-5 space-y-1 marker:text-red-500 text-red-800">
                  <li>Immigration status</li>
                  <li>Legal matters</li>
                  <li>Financial transactions</li>
                  <li>Personal circumstances shared in consultations</li>
                </ul>
                <p className="text-xs font-bold text-red-900 mt-2">Verixa treats such data with enhanced safeguards.</p>
              </div>
            </div>

            <div className="bg-[#F5F7FA] p-6 rounded-2xl border border-[#0F2A44]/10 space-y-4 mt-6">
              <h3 className="text-lg font-bold text-[#0F2A44]">Consultant Data</h3>
              <p className="text-sm">Information related to consultants may include:</p>
              <ul className="text-sm list-disc pl-5 space-y-1 marker:text-[#2FA4A9]">
                <li>Public registry data (CICC)</li>
                <li>Professional details</li>
                <li>Profile information</li>
                <li>Reviews and ratings</li>
              </ul>
              <div className="bg-white p-4 rounded-xl border border-amber-200 mt-4 flex gap-3 items-start shadow-sm">
                <span className="text-amber-500 text-xl">⚠️</span>
                <p className="text-sm text-amber-900 leading-relaxed font-medium">
                  <strong>Important:</strong> Public registry data is considered publicly available information, but once processed and displayed, it must still respect fair use and context.
                </p>
              </div>
              <div className="text-xs text-gray-500 mt-2">📌 Ref: PIPEDA Regulations Specifying Publicly Available Information</div>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* 5. Accountability */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
              <span className="text-[#2FA4A9]">5.</span> Accountability
            </h2>
            <div className="prose prose-gray max-w-none text-gray-600 leading-relaxed text-[15px]">
              <p>
                Verixa is responsible for personal information under its control and has designated a Privacy Officer responsible for compliance with PIPEDA.
              </p>
              <p className="font-bold text-[#0F2A44] mt-4">Responsibilities include:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2 marker:text-[#2FA4A9]">
                <li>Ensuring compliance with applicable laws</li>
                <li>Responding to data access requests</li>
                <li>Managing complaints</li>
                <li>Monitoring internal data practices</li>
              </ul>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* 6. Consent */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
              <span className="text-[#2FA4A9]">6.</span> Consent
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-[#0F2A44] mb-2">Principle</h3>
                <p className="text-[15px]">Verixa collects, uses, and discloses personal information only with user knowledge and consent, except where permitted or required by law.</p>
                <p className="text-xs text-gray-400 mt-2">📌 Ref: PIPEDA Principle 3 – Consent</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                  <h4 className="font-bold text-[#0F2A44] mb-2">1. Express Consent</h4>
                  <p className="text-sm text-gray-500 mb-2">Required for:</p>
                  <ul className="text-sm list-disc pl-4 marker:text-[#2FA4A9]">
                    <li>Account creation</li>
                    <li>Booking consultations</li>
                    <li>Providing personal details</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                  <h4 className="font-bold text-[#0F2A44] mb-2">2. Implied Consent</h4>
                  <p className="text-sm text-gray-500 mb-2">Applies when:</p>
                  <ul className="text-sm list-disc pl-4 marker:text-[#2FA4A9]">
                    <li>Users browse the platform</li>
                    <li>Users interact with public consultant profiles</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-[#0F2A44] mb-2">Withdrawal of Consent</h3>
                <p className="text-[15px]">Users may withdraw consent at any time, subject to:</p>
                <ul className="text-[15px] list-disc pl-6 mt-2 space-y-1 marker:text-[#2FA4A9]">
                  <li>Legal obligations</li>
                  <li>Contractual obligations</li>
                  <li>Operational requirements (e.g., active bookings)</li>
                </ul>
              </div>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* 7 & 8 */}
          <div className="grid md:grid-cols-2 gap-10">
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
                <span className="text-[#2FA4A9]">7.</span> Limiting Collection
              </h2>
              <div className="prose prose-gray max-w-none text-gray-600 leading-relaxed text-[15px]">
                <p>Verixa only collects information that is:</p>
                <ul className="list-disc pl-6 space-y-1 marker:text-[green]">
                  <li>Necessary</li>
                  <li>Relevant</li>
                  <li>Proportionate to the purpose</li>
                </ul>
                <p className="font-bold text-red-600 mt-4">We explicitly do NOT collect excessive or unrelated data.</p>
                <p className="text-xs text-gray-400 mt-4">📌 Ref: PIPEDA Principle 4</p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
                <span className="text-[#2FA4A9]">8.</span> Identifying Purposes
              </h2>
              <div className="prose prose-gray max-w-none text-gray-600 leading-relaxed text-[15px]">
                <p>Before or at the time of collection, we clearly identify why data is collected. Core purposes include:</p>
                <ul className="list-disc pl-6 space-y-1 marker:text-[#2FA4A9]">
                  <li>Facilitating consultant discovery</li>
                  <li>Enabling booking and communication</li>
                  <li>Processing payments</li>
                  <li>Improving platform functionality</li>
                  <li>Ensuring trust and verification</li>
                  <li>Preventing fraud and abuse</li>
                </ul>
              </div>
            </section>
          </div>

          <hr className="border-gray-100" />

          {/* 9. Public Registry Data */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-red-700 flex items-center gap-2">
              <span className="text-red-500">9.</span> Public Registry Data (Critical Section)
            </h2>
            
            <div className="bg-white p-8 rounded-2xl border-2 border-red-100 shadow-sm space-y-6">
              <p className="text-[15px] font-medium">Verixa may display data sourced from official public registries (e.g., CICC).</p>
              
              <div>
                <h4 className="font-bold text-[#0F2A44] border-b pb-2 mb-3">Legal Position:</h4>
                <p className="text-sm mb-2">Under Canadian law, public registry data may be used if:</p>
                <ul className="text-sm list-disc pl-5 marker:text-red-500">
                  <li>It is publicly available</li>
                  <li>It is used for appropriate purposes</li>
                </ul>
                <p className="text-xs text-gray-400 mt-2">📌 Ref: PIPEDA Regulations – Publicly Available Information</p>
              </div>

              <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                <h4 className="font-bold text-[#0F2A44] mb-3">🛡️ Verixa Safeguards:</h4>
                <ul className="text-sm list-disc pl-5 space-y-2 marker:text-green-500 font-medium">
                  <li>Data is displayed for informational purposes only.</li>
                  <li>We do not alter official regulatory status.</li>
                  <li>We provide disclaimers directing users to official sources.</li>
                  <li>Consultants may request corrections or claims.</li>
                </ul>
              </div>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* 10. Data Minimization */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
              <span className="text-[#2FA4A9]">10.</span> Data Minimization & Purpose Limitation
            </h2>
            <div className="prose prose-gray max-w-none text-gray-600 leading-relaxed text-[15px]">
              <p>Verixa ensures that:</p>
              <ul className="list-disc pl-6 space-y-1 marker:text-[#2FA4A9] font-medium">
                <li>Data is only used for the purposes stated</li>
                <li>Data is not repurposed without consent</li>
                <li>Data is not sold to third parties</li>
              </ul>
              <p className="text-xs text-gray-400 mt-4">📌 PIPEDA Principle 5 – Limiting Use, Disclosure, Retention</p>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* 11 & 12. Flow & Legal */}
          <section className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
                <span className="text-[#2FA4A9]">11.</span> High-Level Data Flow
              </h2>
              
              <div className="flex flex-col gap-6 md:flex-row md:items-center bg-[#F5F7FA] p-6 rounded-2xl border border-gray-200">
                <div className="flex-1 space-y-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-[#2FA4A9]">User Flow</span>
                    <p className="text-sm font-bold text-[#0F2A44] mt-1 flex items-center gap-2 flex-wrap">
                      User <span className="text-gray-400">→</span> Search <span className="text-gray-400">→</span> Profile <span className="text-gray-400">→</span> Booking <span className="text-gray-400">→</span> Communication
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-[#2FA4A9]">Data Flow</span>
                    <p className="text-sm font-bold text-[#0F2A44] mt-1 flex items-center gap-2 flex-wrap">
                      User Input <span className="text-gray-400">→</span> Platform Processing <span className="text-gray-400">→</span> Consultant Interaction <span className="text-gray-400">→</span> Logs / Storage
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-[#0F2A44] p-6 rounded-2xl text-white shadow-xl mt-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Scale className="w-32 h-32" />
                </div>
                <h3 className="text-lg font-black text-white mb-2 flex items-center gap-2">
                  <span className="text-amber-400">⚠️</span> Legal Positioning (VERY IMPORTANT)
                </h3>
                <p className="text-sm text-gray-300 mb-4">Verixa acts as a facilitator, not a legal representative or immigration advisor.</p>
                <ul className="text-sm list-none pl-0 space-y-3 font-medium">
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div> Is not an immigration consultant</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div> Does not provide legal advice</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div> Does not represent users before IRCC or any authority</li>
                </ul>
                <p className="text-sm text-amber-200 mt-4 font-bold border-t border-white/20 pt-4">All professional services are provided solely by licensed consultants.</p>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
                <span className="text-[#2FA4A9]">12.</span> Anti-Misrepresentation Clause
              </h2>
              <div className="bg-white border-2 border-red-50 p-6 rounded-2xl">
                <p className="font-bold text-[#0F2A44] mb-3">Verixa explicitly prohibits:</p>
                <ul className="list-disc pl-5 space-y-1 marker:text-red-400 text-[15px] font-medium mb-4">
                  <li>False claims of consultant identity</li>
                  <li>Misuse of profiles</li>
                  <li>Unauthorized data manipulation</li>
                </ul>
                <p className="font-bold text-[#0F2A44] mb-3 border-t border-gray-100 pt-3">Violations may result in:</p>
                <ul className="list-disc pl-5 space-y-1 marker:text-[#0F2A44] text-[15px] font-medium text-red-600">
                  <li>Account suspension</li>
                  <li>Legal reporting where applicable</li>
                </ul>
              </div>
            </div>

          </section>

          {/* PART 2 START */}
          
          <div className="mt-20 mb-8 flex items-center gap-4">
            <h2 className="text-3xl font-black text-[#0F2A44] font-serif">Part 2 — Data Collection, Use, Storage & Disclosure</h2>
            <div className="h-px bg-gray-200 flex-1"></div>
          </div>

          {/* 13. Types of Personal Information */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
              <span className="text-[#2FA4A9]">13.</span> Types of Personal Information We Collect
            </h2>
            <p className="text-[15px] font-medium text-gray-600">Verixa collects only information necessary to operate the platform effectively.</p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
              <div className="bg-white border rounded-2xl p-6 shadow-sm">
                <h4 className="font-bold text-[#0F2A44] mb-4 flex items-center gap-2 border-b pb-2">
                  <span className="text-[#2FA4A9]">13.1</span> Users
                </h4>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Registration</p>
                <ul className="text-sm list-disc pl-4 space-y-1 marker:text-[#2FA4A9] mb-4">
                  <li>Full name</li>
                  <li>Email address</li>
                  <li>Password (hashed, never plain text)</li>
                </ul>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Booking</p>
                <ul className="text-sm list-disc pl-4 space-y-1 marker:text-[#2FA4A9] mb-4">
                  <li>Selected consultant & Time</li>
                  <li>Notes / Case description (optional)</li>
                  <li>Contact preferences</li>
                </ul>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Profile</p>
                <ul className="text-sm list-disc pl-4 space-y-1 marker:text-[#2FA4A9]">
                  <li>Nationality (optional) & Languages</li>
                  <li>Immigration goals</li>
                </ul>
              </div>

              <div className="bg-white border rounded-2xl p-6 shadow-sm">
                <h4 className="font-bold text-[#0F2A44] mb-4 flex items-center gap-2 border-b pb-2">
                  <span className="text-[#2FA4A9]">13.2</span> Consultants
                </h4>
                <ul className="text-sm list-disc pl-4 space-y-1 marker:text-[#2FA4A9] mb-4">
                  <li>License number & Name</li>
                  <li>Status (from public registry)</li>
                  <li>Company / affiliation</li>
                  <li>Contact details</li>
                  <li>Profile content (bio, services, pricing)</li>
                </ul>
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-[11px] text-amber-900 mt-auto">
                  <span className="font-bold">⚠️ Important:</span> Data from public registries is processed as public data but displayed with exact precision.
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white border rounded-2xl p-6 shadow-sm">
                  <h4 className="font-bold text-[#0F2A44] mb-3 flex items-center gap-2 border-b pb-2">
                    <span className="text-[#2FA4A9]">13.3</span> Automated
                  </h4>
                  <ul className="text-sm list-disc pl-4 space-y-1 marker:text-[#2FA4A9]">
                    <li>IP address & Device/Browser type</li>
                    <li>Pages visited</li>
                    <li>Interaction logs (clicks, bookings)</li>
                  </ul>
                  <p className="text-[10px] text-gray-400 mt-2">📌 Ref: PIPEDA Security allowances</p>
                </div>
                
                <div className="bg-white border rounded-2xl p-6 shadow-sm border-r-[4px] border-r-green-500">
                  <h4 className="font-bold text-[#0F2A44] mb-3 flex items-center gap-2 border-b pb-2">
                    <span className="text-[#2FA4A9]">13.4</span> Payment Info
                  </h4>
                  <p className="text-[13px] font-medium mb-2">Verixa does <strong>not</strong> store full payment card details.</p>
                  <ul className="text-xs list-disc pl-4 space-y-1 marker:text-green-500">
                    <li>Processed securely via Stripe</li>
                    <li>Only limited metadata stored: ID, amount, status</li>
                  </ul>
                  <p className="text-[10px] text-gray-400 mt-2">📌 PIPEDA Principle 7</p>
                </div>
              </div>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* 14 & 15. Purpose & Limiting Use */}
          <div className="grid md:grid-cols-2 gap-10">
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
                <span className="text-[#2FA4A9]">14.</span> Purpose of Data Use
              </h2>
              <div className="prose prose-gray max-w-none text-gray-600 leading-relaxed text-[15px]">
                <p>We use collected data strictly for:</p>
                
                <h4 className="font-bold text-[#0F2A44] mt-4 mb-2">Core Functions</h4>
                <ul className="list-disc pl-6 space-y-1 marker:text-[#2FA4A9] mb-4">
                  <li>Matching users with consultants</li>
                  <li>Processing bookings and communications</li>
                  <li>Managing user accounts</li>
                </ul>

                <h4 className="font-bold text-[#0F2A44] mb-2">Operational Functions</h4>
                <ul className="list-disc pl-6 space-y-1 marker:text-[#2FA4A9] mb-4">
                  <li>Improving platform performance</li>
                  <li>Preventing fraud and monitoring system activity</li>
                  <li>Customer support</li>
                </ul>

                <h4 className="font-bold text-[#0F2A44] mb-2">Legal & Compliance</h4>
                <ul className="list-disc pl-6 space-y-1 marker:text-[#2FA4A9]">
                  <li>Enforcing terms and responding to legal requests</li>
                  <li>Maintaining audit logs</li>
                </ul>
                <p className="text-xs text-gray-400 mt-4">📌 Ref: PIPEDA Principle 2</p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
                <span className="text-[#2FA4A9]">15.</span> Limiting Use
              </h2>
              <div className="bg-[#0F2A44] text-white p-6 rounded-2xl shadow-xl space-y-4">
                <p className="font-bold text-lg mb-4">Verixa does NOT:</p>
                <ul className="list-none pl-0 space-y-3 font-medium">
                  <li className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-red-400"></div> Sell personal data</li>
                  <li className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-red-400"></div> Share personal data for advertising resale</li>
                  <li className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-red-400"></div> Use personal data for unrelated purposes</li>
                </ul>
                <div className="mt-6 pt-6 border-t border-white/10 text-[15px]">
                  Data is used only within the scope of <strong>“reasonable and necessary purposes”</strong> under PIPEDA.
                </div>
              </div>
            </section>
          </div>

          <hr className="border-gray-100" />

          {/* 16. Data Retention */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
              <span className="text-[#2FA4A9]">16.</span> Data Retention
            </h2>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6">
              <p className="text-[15px] font-medium mb-4">We retain personal information only as long as necessary. Retention periods depend on active account status, booking history, and legal obligations.</p>
              
              <h4 className="font-bold text-[#0F2A44] mb-3">Examples:</h4>
              <ul className="grid md:grid-cols-3 gap-4">
                <li className="bg-white p-4 rounded-xl shadow-sm text-sm">
                  <strong>Booking data</strong><br/><span className="text-gray-500">Retained for audit & dispute resolution.</span>
                </li>
                <li className="bg-white p-4 rounded-xl shadow-sm text-sm">
                  <strong>Logs</strong><br/><span className="text-gray-500">Retained for security monitoring.</span>
                </li>
                <li className="bg-white p-4 rounded-xl shadow-sm text-sm">
                  <strong>Inactive accounts</strong><br/><span className="text-gray-500">May be anonymized or deleted eventually.</span>
                </li>
              </ul>
              <p className="text-xs text-gray-400 mt-4">📌 Ref: PIPEDA Principle 5</p>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* 17. Security */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
              <span className="text-[#2FA4A9]">17.</span> Data Storage & Security
            </h2>
            <p className="text-[15px] font-medium text-gray-600">Verixa implements strong safeguards to protect data.</p>
            
            <div className="grid md:grid-cols-3 gap-6 mt-4">
              <div className="space-y-3">
                <h4 className="font-bold text-[#0F2A44] border-b pb-2">Technical Safeguards</h4>
                <ul className="text-[14px] list-disc pl-4 space-y-1 marker:text-[#2FA4A9] text-gray-600">
                  <li>Encryption (HTTPS / TLS)</li>
                  <li>Password hashing (bcrypt/equiv)</li>
                  <li>Secure server infrastructure</li>
                  <li>Access control systems</li>
                  <li>Rate limiting and monitoring</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-bold text-[#0F2A44] border-b pb-2">Organizational Safeguards</h4>
                <ul className="text-[14px] list-disc pl-4 space-y-1 marker:text-[#2FA4A9] text-gray-600">
                  <li>Restricted access to sensitive data</li>
                  <li>Role-based permissions</li>
                  <li>Internal logging and monitoring</li>
                  <li>Security review practices</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-bold text-[#0F2A44] border-b pb-2">Physical Safeguards</h4>
                <ul className="text-[14px] list-disc pl-4 space-y-1 marker:text-[#2FA4A9] text-gray-600">
                  <li>Secure hosting environments</li>
                  <li>Cloud provider security standards</li>
                </ul>
              </div>
            </div>
            <p className="text-xs text-gray-400">📌 Ref: PIPEDA Principle 7</p>
          </section>

          <hr className="border-gray-100" />

          {/* 18. Third-Party Service Providers */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
              <span className="text-[#2FA4A9]">18.</span> Third-Party Service Providers
            </h2>
            <p className="text-[15px] font-medium text-gray-600 mb-6">Verixa uses trusted third-party providers to operate the platform.</p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white border rounded-xl p-5 shadow-sm">
                <h4 className="font-bold text-[#0F2A44] mb-2 text-sm tracking-widest uppercase text-[#2FA4A9]">Payment Processing</h4>
                <p className="text-sm text-gray-600 mb-2">Handled by: Stripe (or equivalent)</p>
                <p className="text-sm font-medium text-green-700 bg-green-50 p-2 rounded">We do not store full card numbers or CVV.</p>
              </div>
              <div className="bg-white border rounded-xl p-5 shadow-sm">
                <h4 className="font-bold text-[#0F2A44] mb-2 text-sm tracking-widest uppercase text-[#2FA4A9]">Email Delivery</h4>
                <p className="text-sm text-gray-600">Handled by: Transactional email services (e.g., Resend)</p>
              </div>
              <div className="bg-white border rounded-xl p-5 shadow-sm">
                <h4 className="font-bold text-[#0F2A44] mb-2 text-sm tracking-widest uppercase text-[#2FA4A9]">Infrastructure</h4>
                <p className="text-sm text-gray-600">May include: Cloud hosting providers & managed database services.</p>
              </div>
              <div className="bg-gray-50 border rounded-xl p-5 shadow-sm">
                <h4 className="font-bold text-[#0F2A44] mb-2 text-sm tracking-widest uppercase">Legal Position</h4>
                <ul className="text-sm text-gray-600 list-disc pl-4 space-y-1">
                  <li>Third parties provide adequate protection.</li>
                  <li>Data is used only for intended purposes.</li>
                  <li>Contracts include privacy obligations.</li>
                </ul>
              </div>
            </div>
            <p className="text-xs text-gray-400">📌 Ref: PIPEDA Accountability Principle</p>
          </section>

          <hr className="border-gray-100" />

          {/* 19 & 20. Cross-border & Disclosure */}
          <div className="grid md:grid-cols-2 gap-10">
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
                <span className="text-[#2FA4A9]">19.</span> Cross-Border Transfers
              </h2>
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <p className="text-[15px] text-gray-600 mb-4">Your data may be processed outside Canada (e.g., cloud infrastructure).</p>
                <ul className="text-sm list-disc pl-5 space-y-2 text-gray-600">
                  <li>Data may be subject to foreign laws.</li>
                  <li>Verixa ensures reasonable safeguards are in place.</li>
                </ul>
                <p className="text-xs text-gray-400 mt-4">📌 Ref: OPC guidance on cross-border data flows.</p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
                <span className="text-[#2FA4A9]">20.</span> Disclosure of Info
              </h2>
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <ul className="text-[14px] list-disc pl-5 space-y-3 text-gray-600">
                  <li><strong>With Consultants:</strong> When booking, only necessary info is shared.</li>
                  <li><strong>With Providers:</strong> Payment processors, email endpoints.</li>
                  <li><strong>Legal Req:</strong> Disclosed if required by law (court orders, law env).</li>
                  <li><strong>Business Transfer:</strong> Merger/Acquisition transfers strictly confidential.</li>
                </ul>
                <p className="text-xs text-gray-400 mt-4">📌 Ref: PIPEDA Section 7(3)</p>
              </div>
            </section>
          </div>

          <hr className="border-gray-100" />

          {/* 21 & 22. Accuracy, Logging & Critical Trust */}
          <section className="space-y-10">
            <div className="grid md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
                  <span className="text-[#2FA4A9]">21.</span> Data Accuracy
                </h2>
                <p className="text-[15px] text-gray-600">We strive to keep personal information accurate, complete, and up-to-date. Users and consultants can update their information securely through their account dashboard limits.</p>
                <p className="text-xs text-gray-400">📌 Ref: PIPEDA Principle 6</p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-[#0F2A44] flex items-center gap-2">
                  <span className="text-[#2FA4A9]">22.</span> Logging & Monitoring
                </h2>
                <div className="text-[14px] text-gray-600 grid grid-cols-2 gap-4">
                  <div>
                    <strong className="text-gray-800">Maintains logs for:</strong>
                    <ul className="list-disc pl-4 mt-1"><li>System activity</li><li>Booking events</li><li>Auth actions</li></ul>
                  </div>
                  <div>
                    <strong className="text-gray-800">Purpose:</strong>
                    <ul className="list-disc pl-4 mt-1"><li>Security</li><li>Fraud detection</li><li>Disputes</li></ul>
                  </div>
                </div>
              </div>
            </div>

            {/* CRITICAL TRUST STATEMENT */}
            <div className="bg-[#1A1F2B] text-white p-8 lg:p-10 rounded-3xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <ShieldCheck className="w-48 h-48 text-white" />
              </div>
              <h3 className="text-2xl font-black text-amber-400 mb-6 flex items-center gap-3">
                ⚠️ Critical Trust Statement
              </h3>
              <p className="text-lg font-bold mb-4 border-b border-white/10 pb-4">Verixa specifically does NOT:</p>
              <ul className="space-y-4 text-[16px] font-medium">
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 shrink-0 rounded-full bg-amber-400"></div>
                  Access private consultation conversations beyond what is necessary to deliver the direct core booking service.
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 shrink-0 rounded-full bg-amber-400"></div>
                  Intercept direct communications that occur external to the physical Verixa platform.
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 shrink-0 rounded-full bg-amber-400"></div>
                  Record audio/video calls unless explicitly stated via UI elements and consciously consented to by both parties.
                </li>
              </ul>
            </div>
          </section>

          <div className="mt-16 text-center border-t border-gray-100 pt-16">
             <span className="inline-flex items-center justify-center py-2 px-6 bg-[#0F2A44] text-white rounded-full text-sm font-bold tracking-widest shadow-xl">
               PIPEDA COMPLIANCE COMPLETE
             </span>
             <p className="text-sm text-gray-500 mt-6 font-medium max-w-lg mx-auto">This Data Protection Policy comprehensively protects all operations natively occurring across the Verixa global architecture.</p>
          </div>

        </div>
      </div>
    </main>
  );
}
