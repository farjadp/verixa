import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CheckCircle2, ChevronRight, HelpCircle, ShieldCheck, Eye, TrendingUp, CalendarCheck, Target, ArrowUpRight, Check, Minus } from "lucide-react";
import Link from "next/link";

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

      {/* 3. PRICING TABLE (CORE) */}
      <section className="py-24 bg-[#F5F7FA]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-[#0F2A44] mb-4">Choose Your Growth Trajectory</h2>
            <p className="text-gray-500 text-lg">Invest in your digital infrastructure. Upgrade to lower commissions and higher visibility.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* FREE PLAN */}
            <div className="bg-white rounded-3xl p-8 border border-gray-200 flex flex-col hover:border-[#2FA4A9] transition duration-300">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-400 mb-2">Free</h3>
                <div className="font-serif">
                  <span className="text-4xl font-black text-[#0F2A44]">$0</span>
                  <span className="text-gray-400 font-medium">/mo</span>
                </div>
                <p className="text-sm text-gray-500 mt-3 font-medium">Basic presence. Organic discovery.</p>
              </div>
              <ul className="space-y-4 mb-8 flex-1 text-[15px] font-medium text-gray-600">
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-[#2FA4A9] shrink-0" /> Basic Verixa Profile</li>
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-[#2FA4A9] shrink-0" /> Standard Search Visibility</li>
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-[#2FA4A9] shrink-0" /> Booking Enabled</li>
                <li className="flex items-start gap-3 bg-gray-50 p-2 rounded-lg text-[#0F2A44] font-bold"><Target className="w-5 h-5 text-gray-400 shrink-0" /> 21% Commission Fee</li>
              </ul>
              <Link href="/signup/consultant" className="w-full py-3 px-4 bg-gray-100 text-[#0F2A44] font-bold rounded-xl text-center hover:bg-gray-200 transition">Get Started</Link>
            </div>

            {/* STARTER PLAN */}
            <div className="bg-white rounded-3xl p-8 border border-gray-200 flex flex-col hover:border-[#0F2A44] transition duration-300 shadow-xl shadow-gray-200/50">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-[#2FA4A9] mb-2">Starter</h3>
                <div className="font-serif">
                  <span className="text-4xl font-black text-[#0F2A44]">$49</span>
                  <span className="text-gray-400 font-medium">/mo</span>
                </div>
                <p className="text-sm text-gray-500 mt-3 font-medium">For independent professionals.</p>
              </div>
              <ul className="space-y-4 mb-8 flex-1 text-[15px] font-medium text-gray-600">
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-[#2FA4A9] shrink-0" /> Boosted Search Visibility</li>
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-[#2FA4A9] shrink-0" /> Review Responses Enabled</li>
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-[#2FA4A9] shrink-0" /> Basic Analytics</li>
                <li className="flex items-start gap-3 bg-[#2FA4A9]/10 p-2 rounded-lg text-[#0F2A44] font-bold"><Target className="w-5 h-5 text-[#2FA4A9] shrink-0" /> 8% Commission Fee</li>
              </ul>
              <Link href="/signup/consultant?plan=starter" className="w-full py-3 px-4 bg-white border-2 border-[#0F2A44] text-[#0F2A44] font-bold rounded-xl text-center hover:bg-gray-50 transition">Upgrade to Starter</Link>
            </div>

            {/* GROWTH PLAN */}
            <div className="bg-[#0F2A44] rounded-3xl p-8 border border-[#0F2A44] flex flex-col relative shadow-2xl shadow-[#0F2A44]/30 transform lg:-translate-y-4">
              <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-[#2FA4A9] text-white text-xs font-black uppercase tracking-widest py-1 px-4 rounded-full">Most Popular</div>
              <div className="mb-6">
                <h3 className="text-xl font-bold text-[#2FA4A9] mb-2">Growth</h3>
                <div className="font-serif">
                  <span className="text-4xl font-black text-white">$99</span>
                  <span className="text-gray-400 font-medium">/mo</span>
                </div>
                <p className="text-sm text-gray-300 mt-3 font-medium">Maximum ROI and dedicated exposure.</p>
              </div>
              <ul className="space-y-4 mb-8 flex-1 text-[15px] font-medium text-gray-300">
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-[#2FA4A9] shrink-0" /> High Search Visibility</li>
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-[#2FA4A9] shrink-0" /> Featured Placements</li>
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-[#2FA4A9] shrink-0" /> Competitor Ads Removed</li>
                <li className="flex items-start gap-3 bg-[#1A3855] p-2 rounded-lg text-white font-bold border border-[#2FA4A9]/30"><Target className="w-5 h-5 text-[#2FA4A9] shrink-0" /> 3% Commission Fee</li>
              </ul>
              <Link href="/signup/consultant?plan=growth" className="w-full py-4 px-4 bg-[#2FA4A9] text-white font-bold rounded-xl text-center hover:bg-[#258a8f] transition shadow-lg shadow-[#2FA4A9]/20">Start Growing</Link>
            </div>

            {/* PRO PLAN */}
            <div className="bg-white rounded-3xl p-8 border border-gray-200 flex flex-col hover:border-[#0F2A44] transition duration-300">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Pro</h3>
                <div className="font-serif">
                  <span className="text-4xl font-black text-[#0F2A44]">$199</span>
                  <span className="text-gray-400 font-medium">/mo</span>
                </div>
                <p className="text-sm text-gray-500 mt-3 font-medium">For established firms and agencies.</p>
              </div>
              <ul className="space-y-4 mb-8 flex-1 text-[15px] font-medium text-gray-600">
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-[#2FA4A9] shrink-0" /> Maximum Search Dominance</li>
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-[#2FA4A9] shrink-0" /> Custom Branding & Domain</li>
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-[#2FA4A9] shrink-0" /> Firm-level Lead Tracking</li>
                <li className="flex items-start gap-3 bg-gray-900 p-2 rounded-lg text-white font-bold"><Target className="w-5 h-5 text-gray-400 shrink-0" /> 0% Commission Fee</li>
              </ul>
              <Link href="/signup/consultant?plan=pro" className="w-full py-3 px-4 bg-gray-900 text-white font-bold rounded-xl text-center hover:bg-black transition shadow-lg">Go Professional</Link>
            </div>

          </div>
        </div>
      </section>

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
      <section id="comparison" className="py-24 bg-white border-y border-gray-100 hidden lg:block">
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
                  <th className="p-4 border-b-2 border-gray-200 text-center font-bold text-gray-400">Free</th>
                  <th className="p-4 border-b-2 border-gray-200 text-center font-bold text-[#0F2A44]">Starter</th>
                  <th className="p-4 border-b-2 border-[#2FA4A9] text-center font-bold text-[#2FA4A9]">Growth</th>
                  <th className="p-4 border-b-2 border-gray-200 text-center font-bold text-gray-900">Pro</th>
                </tr>
              </thead>
              <tbody className="text-sm font-medium text-gray-600">
                {/* Visibility */}
                <tr className="bg-gray-50">
                  <td colSpan={5} className="p-3 font-bold text-[#0F2A44] text-xs uppercase tracking-widest">Visibility & Conversion</td>
                </tr>
                <tr>
                  <td className="p-4 border-b border-gray-100">Visibility Score</td>
                  <td className="p-4 border-b border-gray-100 text-center text-gray-400">Low</td>
                  <td className="p-4 border-b border-gray-100 text-center text-[#0F2A44]">Boosted</td>
                  <td className="p-4 border-b border-gray-100 text-center text-[#2FA4A9] font-bold">High</td>
                  <td className="p-4 border-b border-gray-100 text-center text-gray-900 font-bold">Maximum</td>
                </tr>
                <tr>
                  <td className="p-4 border-b border-gray-100">Booking Enabled</td>
                  <td className="p-4 border-b border-gray-100 text-center"><Check className="w-4 h-4 mx-auto text-green-500" /></td>
                  <td className="p-4 border-b border-gray-100 text-center"><Check className="w-4 h-4 mx-auto text-green-500" /></td>
                  <td className="p-4 border-b border-gray-100 text-center"><Check className="w-4 h-4 mx-auto text-green-500" /></td>
                  <td className="p-4 border-b border-gray-100 text-center"><Check className="w-4 h-4 mx-auto text-green-500" /></td>
                </tr>
                <tr className="bg-[#0F2A44]/5">
                  <td className="p-4 border-b border-gray-100 font-bold text-[#0F2A44]">Platform Commission Rate</td>
                  <td className="p-4 border-b border-gray-100 text-center font-bold text-gray-500">21%</td>
                  <td className="p-4 border-b border-gray-100 text-center font-bold text-[#0F2A44]">8%</td>
                  <td className="p-4 border-b border-gray-100 text-center font-bold text-[#2FA4A9]">3%</td>
                  <td className="p-4 border-b border-gray-100 text-center font-bold text-black">0%</td>
                </tr>
                
                {/* Trust & Profile */}
                <tr className="bg-gray-50">
                  <td colSpan={5} className="p-3 font-bold text-[#0F2A44] text-xs uppercase tracking-widest border-t border-gray-100">Trust & Profile Control</td>
                </tr>
                <tr>
                  <td className="p-4 border-b border-gray-100">Verified Badge</td>
                  <td className="p-4 border-b border-gray-100 text-center"><Check className="w-4 h-4 mx-auto text-green-500" /></td>
                  <td className="p-4 border-b border-gray-100 text-center"><Check className="w-4 h-4 mx-auto text-green-500" /></td>
                  <td className="p-4 border-b border-gray-100 text-center"><Check className="w-4 h-4 mx-auto text-green-500" /></td>
                  <td className="p-4 border-b border-gray-100 text-center"><Check className="w-4 h-4 mx-auto text-green-500" /></td>
                </tr>
                <tr>
                  <td className="p-4 border-b border-gray-100">Respond to Reviews</td>
                  <td className="p-4 border-b border-gray-100 text-center"><Minus className="w-4 h-4 mx-auto text-gray-300" /></td>
                  <td className="p-4 border-b border-gray-100 text-center"><Check className="w-4 h-4 mx-auto text-green-500" /></td>
                  <td className="p-4 border-b border-gray-100 text-center"><Check className="w-4 h-4 mx-auto text-green-500" /></td>
                  <td className="p-4 border-b border-gray-100 text-center"><Check className="w-4 h-4 mx-auto text-green-500" /></td>
                </tr>
                <tr>
                  <td className="p-4 border-b border-gray-100">Competitor Ads Removed</td>
                  <td className="p-4 border-b border-gray-100 text-center"><Minus className="w-4 h-4 mx-auto text-gray-300" /></td>
                  <td className="p-4 border-b border-gray-100 text-center"><Minus className="w-4 h-4 mx-auto text-gray-300" /></td>
                  <td className="p-4 border-b border-gray-100 text-center"><Check className="w-4 h-4 mx-auto text-green-500" /></td>
                  <td className="p-4 border-b border-gray-100 text-center"><Check className="w-4 h-4 mx-auto text-green-500" /></td>
                </tr>
                
                {/* Advanced Features */}
                <tr className="bg-gray-50">
                  <td colSpan={5} className="p-3 font-bold text-[#0F2A44] text-xs uppercase tracking-widest border-t border-gray-100">Advanced Systems</td>
                </tr>
                <tr>
                  <td className="p-4 border-b border-gray-100">Analytics Access</td>
                  <td className="p-4 border-b border-gray-100 text-center"><Minus className="w-4 h-4 mx-auto text-gray-300" /></td>
                  <td className="p-4 border-b border-gray-100 text-center text-xs">Basic</td>
                  <td className="p-4 border-b border-gray-100 text-center text-xs font-bold text-[#2FA4A9]">Advanced</td>
                  <td className="p-4 border-b border-gray-100 text-center text-xs font-bold text-gray-900">Enterprise</td>
                </tr>
                <tr>
                  <td className="p-4 border-b border-gray-100">Custom Branding</td>
                  <td className="p-4 border-b border-gray-100 text-center"><Minus className="w-4 h-4 mx-auto text-gray-300" /></td>
                  <td className="p-4 border-b border-gray-100 text-center"><Minus className="w-4 h-4 mx-auto text-gray-300" /></td>
                  <td className="p-4 border-b border-gray-100 text-center"><Minus className="w-4 h-4 mx-auto text-gray-300" /></td>
                  <td className="p-4 border-b border-gray-100 text-center"><Check className="w-4 h-4 mx-auto text-green-500" /></td>
                </tr>
                <tr>
                  <td className="p-4 border-b border-gray-100">Priority Support</td>
                  <td className="p-4 border-b border-gray-100 text-center"><Minus className="w-4 h-4 mx-auto text-gray-300" /></td>
                  <td className="p-4 border-b border-gray-100 text-center"><Minus className="w-4 h-4 mx-auto text-gray-300" /></td>
                  <td className="p-4 border-b border-gray-100 text-center"><Check className="w-4 h-4 mx-auto text-green-500" /></td>
                  <td className="p-4 border-b border-gray-100 text-center"><Check className="w-4 h-4 mx-auto text-green-500" /></td>
                </tr>
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
