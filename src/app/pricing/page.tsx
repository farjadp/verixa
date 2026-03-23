import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CheckCircle2, ChevronRight, HelpCircle, ShieldCheck, Eye, TrendingUp, CalendarCheck, Target, ArrowUpRight, Check, Minus } from "lucide-react";
import Link from "next/link";
import PricingTiers from "./PricingTiers";

export const metadata = {
  title: "Pricing | Membership for Verified Consultants",
  description: "Join Canada's premier immigration marketplace. Get discovered, build trust, and convert high-intent clients.",
};

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#F5F7FA] font-sans selection:bg-[#2FA4A9] selection:text-white">
      <Header />
      
      {/* 1. HERO SECTION */}
      <section className="pt-40 pb-20 px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-sm font-bold text-[#0F2A44] mb-8 shadow-sm">
          <ShieldCheck className="w-4 h-4 text-[#2FA4A9]" />
          Exclusive Network for RCICs & Immigration Lawyers
        </div>
        <h1 className="text-5xl lg:text-7xl font-black text-[#0F2A44] tracking-tight mb-8 font-serif leading-tight">
          Be Seen. Build Trust. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0F2A44] to-[#2FA4A9]">Book Clients.</span>
        </h1>
        <p className="text-xl text-gray-500 font-medium max-w-2xl mx-auto mb-10 leading-relaxed">
          The Canadian immigration market is crowded. Verixa cuts through the noise, putting your verified profile directly in front of high-intent clients ready to hire.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/signup/consultant" className="bg-[#0F2A44] text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-[#0a1f33] transition-all shadow-xl shadow-[#0F2A44]/20 flex items-center gap-2 group w-full sm:w-auto justify-center">
            Claim Your Profile
            <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </Link>
          <a href="#comparison" className="bg-white text-[#0F2A44] border border-gray-200 px-8 py-4 rounded-xl font-bold text-lg hover:border-[#0F2A44] transition-all w-full sm:w-auto text-center">
            Compare Plans
          </a>
        </div>
      </section>

      {/* 2. VALUE EXPLANATION */}
      <section className="py-24 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-12">
             <div>
               <div className="w-14 h-14 bg-[#0F2A44] rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-[#0F2A44]/20">
                 <Eye className="w-7 h-7 text-white" />
               </div>
               <h3 className="text-2xl font-black text-[#0F2A44] mb-3">Algorithmic Visibility</h3>
               <p className="text-gray-500 leading-relaxed">
                 Clients search for your exact expertise. A free profile limits your reach, while premium tiers guarantee priority placement in front of active searchers. Stop fighting algorithms.
               </p>
             </div>
             <div>
               <div className="w-14 h-14 bg-[#2FA4A9] rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-[#2FA4A9]/20">
                 <ShieldCheck className="w-7 h-7 text-white" />
               </div>
               <h3 className="text-2xl font-black text-[#0F2A44] mb-3">Institutional Trust</h3>
               <p className="text-gray-500 leading-relaxed">
                 Clients fear fraud. Verixa’s Verified Badge and structured review system instantly convert skeptical browsers into confident buyers. Trust is your highest-converting asset.
               </p>
             </div>
             <div>
               <div className="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-gray-900/20">
                 <CalendarCheck className="w-7 h-7 text-white" />
               </div>
               <h3 className="text-2xl font-black text-[#0F2A44] mb-3">Seamless Booking</h3>
               <p className="text-gray-500 leading-relaxed">
                 Remove the friction. Our integrated calendar and escrow system turns a profile view into a paid consultation in 3 clicks. You focus on the advice; we handle the logistics.
               </p>
             </div>
          </div>
        </div>
      </section>

      {/* 3. INTERACTIVE PRICING TIERS */}
      <PricingTiers />

      {/* 4. ROI SECTION (VERY IMPORTANT) */}
      <section className="py-24 bg-white border-b border-gray-100 relative overflow-hidden">
        {/* Abstract Background Element */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#2FA4A9] opacity-[0.03] rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-5xl mx-auto px-6 lg:px-8 relative z-10">
          <div className="bg-[#0F2A44] rounded-[2.5rem] p-10 lg:p-16 text-center shadow-2xl text-white">
            <h2 className="text-3xl lg:text-5xl font-black mb-6 font-serif">1 Extra Booking Pays For The Core.</h2>
            <p className="text-xl font-medium text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
              If upgrading to Growth or Pro brings you just <strong className="text-white">one additional consultation</strong> per month, the plan pays for itself. Everything after that is pure profit, minus zero commissions.
            </p>
            <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto border-t border-white/10 pt-10">
              <div className="space-y-2">
                <div className="text-3xl font-black text-[#2FA4A9]">2x</div>
                <p className="text-sm font-bold text-gray-300 uppercase tracking-widest">Profile Views</p>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-black text-[#2FA4A9]">0%</div>
                <p className="text-sm font-bold text-gray-300 uppercase tracking-widest">Fees on Pro</p>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-black text-[#2FA4A9]">24/7</div>
                <p className="text-sm font-bold text-gray-300 uppercase tracking-widest">Passive Leads</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. EXPLANATION SECTION: HOW VISIBILITY WORKS */}
      <section className="py-24 bg-[#F5F7FA]">
         <div className="max-w-7xl mx-auto px-6 lg:px-8 grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 border border-red-200 text-xs font-black text-red-800 uppercase tracking-widest mb-6">
                Transparency Warning
              </div>
              <h2 className="text-3xl lg:text-4xl font-black text-[#0F2A44] mb-6 leading-tight">
                How Visibility Actually Works
              </h2>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                If you don't pay for platform infrastructure, you simply will not rank as high as those who do. The algorithm weights profiles based on four strict factors:
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-4">
                  <div className="bg-[#0F2A44] text-white w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold">1</div>
                  <div>
                    <h4 className="font-bold text-[#0F2A44] text-lg">Subscription Tier (Primary Weight)</h4>
                    <p className="text-sm text-gray-500">Pro & Growth accounts receive highest index priority.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="bg-white border-2 border-gray-200 text-[#0F2A44] w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold">2</div>
                  <div>
                    <h4 className="font-bold text-[#0F2A44] text-lg">Profile Completeness</h4>
                    <p className="text-sm text-gray-500">Empty bios or missing services are penalized algorithmically.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="bg-white border-2 border-gray-200 text-[#0F2A44] w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold">3</div>
                  <div>
                    <h4 className="font-bold text-[#0F2A44] text-lg">Verified Reviews</h4>
                    <p className="text-sm text-gray-500">Real client outcomes directly boost search position.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="bg-white border-2 border-gray-200 text-[#0F2A44] w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold">4</div>
                  <div>
                    <h4 className="font-bold text-[#0F2A44] text-lg">Calendar Activity</h4>
                    <p className="text-sm text-gray-500">Active engagement and regular bookings increase index presence.</p>
                  </div>
                </li>
              </ul>
            </div>
            
            <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-xl relative">
               <TrendingUp className="absolute -top-6 -right-6 w-24 h-24 text-[#2FA4A9] opacity-10" />
               <h4 className="text-xl font-bold text-[#0F2A44] mb-6 text-center border-b pb-4">Exposure Probability Matrix</h4>
               
               <div className="space-y-6">
                 <div>
                   <div className="flex justify-between text-sm font-bold mb-2">
                     <span className="text-[#0F2A44]">Pro Plan</span>
                     <span className="text-[#2FA4A9]">Maximum</span>
                   </div>
                   <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                     <div className="w-[95%] h-full bg-[#0F2A44] rounded-full"></div>
                   </div>
                 </div>
                 
                 <div>
                   <div className="flex justify-between text-sm font-bold mb-2">
                     <span className="text-gray-700">Growth Plan</span>
                     <span className="text-[#2FA4A9]">High</span>
                   </div>
                   <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                     <div className="w-[75%] h-full bg-[#2FA4A9] rounded-full"></div>
                   </div>
                 </div>

                 <div>
                   <div className="flex justify-between text-sm font-bold mb-2">
                     <span className="text-gray-500">Starter Plan</span>
                     <span className="text-gray-500">Moderate</span>
                   </div>
                   <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                     <div className="w-[40%] h-full bg-gray-300 rounded-full"></div>
                   </div>
                 </div>

                 <div>
                   <div className="flex justify-between text-sm font-bold mb-2">
                     <span className="text-gray-400">Free Plan</span>
                     <span className="text-gray-400">Low</span>
                   </div>
                   <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                     <div className="w-[15%] h-full bg-gray-200 rounded-full"></div>
                   </div>
                 </div>
               </div>
            </div>
         </div>
      </section>

      {/* 6. COMPARISON TABLE */}
      <section id="comparison" className="py-24 bg-white border-y border-gray-100 hidden md:block">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-[#0F2A44] mb-4">Deep Structure Comparison</h2>
            <p className="text-gray-500 text-lg">Compare exactly what each tier unlocks for your firm.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="p-4 border-b-2 border-gray-200 w-1/3"></th>
                  <th className="p-4 border-b-2 border-gray-200 text-center font-bold text-gray-400 w-[16%]">Free</th>
                  <th className="p-4 border-b-2 border-gray-200 text-center font-bold text-[#0F2A44] w-[16%]">Starter</th>
                  <th className="p-4 border-b-2 border-[#2FA4A9] text-center font-bold text-[#2FA4A9] w-[16%]">Growth</th>
                  <th className="p-4 border-b-2 border-gray-200 text-center font-bold text-gray-900 w-[16%]">Pro</th>
                </tr>
              </thead>
              <tbody className="text-sm font-medium text-gray-600">
                
                {/* 1. Visibility & SEO */}
                <TableGroup title="Visibility & SEO" />
                <TableRow label="Algorithmic Search Ranking" vals={["Basic", "Boosted", <span key="1" className="text-[#2FA4A9] font-bold">High Priority</span>, <span key="2" className="text-gray-900 font-bold">Maximum</span>]} />
                <TableRow label="Google Search Indexing" vals={[false, true, true, true]} />
                <TableRow label="Competitor Ad Removal" vals={[false, false, true, true]} />
                <TableRow label="Featured Consultant Badge" vals={[false, false, true, true]} />
                <TableRow label="Category Dominance (e.g. Study Visas)" vals={["None", "1 Category", "3 Categories", "Unlimited"]} />
                <TableRow label="Geographic Targeting" vals={["City", "Province", "National", "Global"]} />

                {/* 2. Trust & Identity */}
                <TableGroup title="Trust & Identity" />
                <TableRow label="CICC/Law Society Verification Badge" vals={[true, true, true, true]} />
                <TableRow label="Structured Review Collection" vals={[true, true, true, true]} />
                <TableRow label="Review Response Management" vals={[false, true, true, true]} />
                <TableRow label="Custom Profile Cover & Branding" vals={[false, "Basic", "Advanced", "Full Agency"]} />
                <TableRow label="Custom Domain Routing (e.g. yourname.com)" vals={[false, false, false, true]} />
                <TableRow label="Trust Score Multiplier" vals={["1.0x", "1.2x", "1.5x", "2.0x"]} />

                {/* 3. Booking & Client Acquisition */}
                <TableGroup title="Booking & Client Acquisition" />
                <TableRow label="Direct Calendar Booking" vals={[true, true, true, true]} />
                <TableRow label="Calendar Sync (Outlook/Google)" vals={["Basic", "Automatic", "Automatic", "Automatic"]} />
                <TableRow label="Consultation Types (e.g. 15min, 1h)" vals={["1 Type", "3 Types", "Unlimited", "Unlimited"]} />
                <TableRow label="Automated Email Reminders" vals={[true, true, true, true]} />
                <TableRow label="Automated SMS Reminders (Anti No-Show)" vals={[false, false, true, true]} />
                <TableRow label="Pre-Booking Custom Questionnaire" vals={[false, "Standard", "Custom", "Advanced Routing"]} />

                {/* 4. Financials & Escrow */}
                <TableGroup title="Financials & Escrow" />
                <TableRow label="Monthly Subscription" vals={["$0", "$49", "$99", "$199"]} />
                <TableRow label="Platform Commission Fee" isDark vals={[<span key="1" className="text-gray-500 font-bold">21%</span>, <span key="2" className="text-[#0F2A44] font-bold">8%</span>, <span key="3" className="text-[#2FA4A9] font-black text-base">3%</span>, <span key="2" className="text-gray-900 font-black text-base">0%</span>]} />
                <TableRow label="Escrow Financial Protection" vals={[true, true, true, true]} />
                <TableRow label="Targeted Service Pricing (Dynamic)" vals={[false, true, true, true]} />
                <TableRow label="Payout Dispatch Speed" vals={["5 Days", "5 Days", "Priority (2 Days)", "Instant"]} />

                {/* 5. Analytics & CRM */}
                <TableGroup title="Analytics & CRM" />
                <TableRow label="Profile Views Dashboard" vals={[false, "Basic", "Advanced", "Enterprise"]} />
                <TableRow label="High-Intent Lead Tracking" vals={[false, false, true, true]} />
                <TableRow label="Conversion Rate Analytics" vals={[false, false, true, true]} />
                <TableRow label="Client CRM Export" vals={[false, false, "CSV Export", "API / Webhook"]} />
                <TableRow label="Market Demand Insights" vals={[false, false, true, true]} />

                {/* 6. Support & Setup */}
                <TableGroup title="Support & Setup" />
                <TableRow label="Platform Support" vals={["Ticket (72h)", "Email (24h)", "Live Chat", "24/7 Priority"]} />
                <TableRow label="Profile Optimization Audit" vals={[false, false, "One-Time", "Quarterly"]} />
                <TableRow label="Dedicated Account Manager" vals={[false, false, false, true]} />

              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 7. FAQ SECTION */}
      <section className="py-24 bg-[#F5F7FA]">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-[#0F2A44] mb-4">Common Questions</h2>
            <p className="text-gray-500 text-lg">Clear answers to your logistics.</p>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border border-gray-100">
               <h4 className="text-lg font-bold text-[#0F2A44] mb-3 flex items-center gap-2"><HelpCircle className="w-5 h-5 text-[#2FA4A9]"/> Is Verixa replacing my personal website?</h4>
               <p className="text-gray-600 text-sm leading-relaxed">No. Verixa acts as an aggressively optimized lead-generation funnel. We invest heavily in market SEO so that when immigrants search for help, they find our registry. Your profile here funnels that immediate intent directly into bookings for you.</p>
            </div>
            
            <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border border-gray-100">
               <h4 className="text-lg font-bold text-[#0F2A44] mb-3 flex items-center gap-2"><HelpCircle className="w-5 h-5 text-[#2FA4A9]"/> What happens if I don't upgrade?</h4>
               <p className="text-gray-600 text-sm leading-relaxed">You remain on the Free plan indefinitely. You can still accept bookings and verify your license, but your profile will rank physically lower in registry search results compared to Premium and Growth members, and you will pay a 21% flat commission fee per booking.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border border-gray-100">
                 <h4 className="text-lg font-bold text-[#0F2A44] mb-3 flex items-center gap-2"><HelpCircle className="w-5 h-5 text-[#2FA4A9]"/> Can I cancel anytime?</h4>
                 <p className="text-gray-600 text-sm leading-relaxed">Yes. All paid tiers are processed monthly. You can revert to the Free plan at any time through your consultant dashboard with no penalties.</p>
              </div>
              <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border border-gray-100">
                 <h4 className="text-lg font-bold text-[#0F2A44] mb-3 flex items-center gap-2"><HelpCircle className="w-5 h-5 text-[#2FA4A9]"/> How does commission work?</h4>
                 <p className="text-gray-600 text-sm leading-relaxed">Depending on your tier, we automatically deduct the respective percentage (e.g. 8% on Starter) prior to transferring the consultation escrow amount into your connected bank account.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FINAL CTA */}
      <section className="py-24 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl lg:text-5xl font-black text-[#0F2A44] font-serif mb-6">Stop leaving clients on the table.</h2>
          <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
            You did the hard work to get your license. Let us do the hard work to get you discovered.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup/consultant" className="bg-[#2FA4A9] text-white px-10 py-5 rounded-2xl font-black tracking-wide text-lg hover:bg-[#258a8f] transition-all shadow-xl shadow-[#2FA4A9]/20 w-full sm:w-auto">
              Claim Your Free Profile
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

// --- HELPER COMPONENTS ---

function TableGroup({ title }: { title: string }) {
  return (
    <tr className="bg-gray-50/80">
      <td colSpan={5} className="p-4 font-black text-[#0F2A44] text-[10px] uppercase tracking-widest border-t border-gray-100">
        {title}
      </td>
    </tr>
  );
}

function TableRow({ label, vals, isDark = false }: { label: string; vals: React.ReactNode[]; isDark?: boolean }) {
  return (
    <tr className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${isDark ? 'bg-[#0F2A44]/5' : ''}`}>
      <td className={`p-4 ${isDark ? 'font-bold text-[#0F2A44]' : 'text-gray-700'}`}>{label}</td>
      {vals.map((v, i) => (
        <td key={i} className="p-4 text-center">
          {typeof v === 'boolean' ? (
            v ? <Check className="w-4 h-4 mx-auto text-teal-500" /> : <Minus className="w-4 h-4 mx-auto text-gray-300" />
          ) : (
            <span className={typeof v === 'string' ? "text-gray-500" : ""}>{v}</span>
          )}
        </td>
      ))}
    </tr>
  );
}
