"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Target, Zap, AlertCircle, Minus } from "lucide-react";

export default function PricingTiers() {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <section className="py-24 bg-[#F5F7FA]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-[#0F2A44] mb-4">Choose Your Growth Trajectory</h2>
          <p className="text-gray-500 text-lg mb-8">Invest in your digital infrastructure. Upgrade to lower commissions and higher visibility.</p>

          {/* TOGGLE */}
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="bg-white p-1.5 rounded-full border border-gray-200 inline-flex items-center shadow-sm relative w-[300px]">
              <div 
                className="absolute top-1.5 bottom-1.5 w-[calc(50%-0.375rem)] bg-[#0F2A44] rounded-full transition-transform duration-300 shadow-md pointer-events-none"
                style={{ transform: isAnnual ? 'translateX(100%)' : 'translateX(0%)' }}
              ></div>
              
              <button 
                onClick={() => setIsAnnual(false)}
                className={`relative z-10 w-1/2 py-3 rounded-full text-sm font-bold transition-colors ${!isAnnual ? 'text-white' : 'text-gray-500 hover:text-[#0F2A44]'}`}
              >
                Monthly
              </button>
              
              <button 
                onClick={() => setIsAnnual(true)}
                className={`relative z-10 w-1/2 py-3 rounded-full text-sm font-bold transition-colors flex items-center justify-center gap-2 ${isAnnual ? 'text-white' : 'text-gray-500 hover:text-[#0F2A44]'}`}
              >
                Annually
              </button>
            </div>
            
            <div className="inline-flex items-center gap-1.5 bg-green-100 border border-green-200 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
              <Zap className="w-3 h-3" /> Save up to 89% with Annual
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* FREE PLAN */}
          <div className="bg-white rounded-3xl p-8 border border-gray-200 flex flex-col hover:border-[#2FA4A9] transition duration-300">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-400 mb-2">Free</h3>
              <div className="font-serif flex items-end gap-1">
                <span className="text-4xl font-black text-[#0F2A44]">$0</span>
                <span className="text-gray-400 font-medium mb-1">/mo</span>
              </div>
              <div className="h-5 mt-1"></div> {/* Spacer to align with annual billing lines */}
              <p className="text-sm text-gray-500 mt-2 font-medium">Basic presence. Organic discovery.</p>
            </div>
            <ul className="space-y-4 mb-8 flex-1 text-[15px] font-medium text-gray-600">
              <li className="flex items-start gap-3"><Check className="w-5 h-5 text-[#2FA4A9] shrink-0" /> Basic Verixa Profile</li>
              <li className="flex items-start gap-3"><Check className="w-5 h-5 text-[#2FA4A9] shrink-0" /> Standard Search Visibility</li>
              <li className="flex items-start gap-3"><Check className="w-5 h-5 text-[#2FA4A9] shrink-0" /> Booking Enabled</li>
              <li className="flex items-start gap-3 bg-gray-50 p-2 rounded-lg text-[#0F2A44] font-bold mt-auto"><Target className="w-5 h-5 text-gray-400 shrink-0" /> 21% Commission Fee</li>
            </ul>
            <Link href="/signup/consultant" className="w-full py-3 px-4 bg-gray-100 text-[#0F2A44] font-bold rounded-xl text-center hover:bg-gray-200 transition">Get Started</Link>
          </div>

          {/* STARTER PLAN */}
          <div className="bg-white rounded-3xl p-8 border border-gray-200 flex flex-col hover:border-[#0F2A44] transition duration-300 shadow-xl shadow-gray-200/50 relative overflow-hidden">
            <div className="mb-6">
              <div className="flex justify-between items-start mb-2">
                 <h3 className="text-xl font-bold text-[#2FA4A9]">Starter</h3>
                 {isAnnual && <span className="bg-[#2FA4A9]/10 text-[#2FA4A9] text-[10px] font-black uppercase px-2 py-0.5 rounded-full">13% OFF</span>}
              </div>
              <div className="font-serif flex items-end gap-1">
                {isAnnual && <span className="text-2xl font-black text-gray-300 line-through mb-1 mr-1">$49</span>}
                <span className="text-4xl font-black text-[#0F2A44]">{isAnnual ? '$42' : '$49'}</span>
                <span className="text-gray-400 font-medium mb-1">/mo</span>
              </div>
              <div className="h-5 mt-1">
                {isAnnual ? (
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Billed $504/yr</span>
                ) : (
                  <span className="text-[10px] font-bold text-transparent select-none">-</span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-2 font-medium">For independent professionals.</p>
            </div>
            <ul className="space-y-4 mb-8 flex-1 text-[15px] font-medium text-gray-600">
              <li className="flex items-start gap-3"><Check className="w-5 h-5 text-[#2FA4A9] shrink-0" /> Boosted Search Visibility</li>
              <li className="flex items-start gap-3"><Check className="w-5 h-5 text-[#2FA4A9] shrink-0" /> Review Responses Enabled</li>
              <li className="flex items-start gap-3"><Check className="w-5 h-5 text-[#2FA4A9] shrink-0" /> Basic Analytics</li>
              <li className="flex items-start gap-3 bg-[#2FA4A9]/10 p-2 rounded-lg text-[#0F2A44] font-bold"><Target className="w-5 h-5 text-[#2FA4A9] shrink-0" /> 8% Commission Fee</li>
            </ul>
            <Link href={`/signup/consultant?plan=starter&billing=${isAnnual ? 'annual' : 'monthly'}`} className="w-full py-3 px-4 bg-white border-2 border-[#0F2A44] text-[#0F2A44] font-bold rounded-xl text-center hover:bg-gray-50 transition">Upgrade to Starter</Link>
          </div>

          {/* GROWTH PLAN */}
          <div className="bg-[#0F2A44] rounded-3xl p-8 border border-[#0F2A44] flex flex-col relative shadow-2xl shadow-[#0F2A44]/30 transform lg:-translate-y-4 group">
            <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-[#2FA4A9] text-white text-xs font-black uppercase tracking-widest py-1 px-4 rounded-full whitespace-nowrap z-10">Most Popular</div>
            <div className="mb-6 relative z-10">
              <div className="flex justify-between items-start mb-2">
                 <h3 className="text-xl font-bold text-[#2FA4A9]">Growth</h3>
                 {isAnnual && <span className="bg-white/20 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full">21% OFF</span>}
              </div>
              <div className="font-serif flex items-end gap-1">
                {isAnnual && <span className="text-2xl font-black text-gray-500 line-through mb-1 mr-1 opacity-60">$99</span>}
                <span className="text-4xl font-black text-white">{isAnnual ? '$78' : '$99'}</span>
                <span className="text-gray-400 font-medium mb-1">/mo</span>
              </div>
              <div className="h-5 mt-1">
                {isAnnual ? (
                  <span className="text-[10px] font-bold text-[#2FA4A9] uppercase tracking-widest">Billed $936/yr</span>
                ) : (
                  <span className="text-[10px] font-bold text-transparent select-none">-</span>
                )}
              </div>
              <p className="text-sm text-gray-300 mt-2 font-medium">Maximum ROI and dedicated exposure.</p>
            </div>
            <ul className="space-y-4 mb-8 flex-1 text-[15px] font-medium text-gray-300 relative z-10">
              <li className="flex items-start gap-3"><Check className="w-5 h-5 text-[#2FA4A9] shrink-0" /> High Search Visibility</li>
              <li className="flex items-start gap-3"><Check className="w-5 h-5 text-[#2FA4A9] shrink-0" /> Featured Placements</li>
              <li className="flex items-start gap-3"><Check className="w-5 h-5 text-[#2FA4A9] shrink-0" /> Competitor Ads Removed</li>
              <li className="flex items-start gap-3 bg-[#1A3855] p-2 rounded-lg text-white font-bold border border-[#2FA4A9]/30"><Target className="w-5 h-5 text-[#2FA4A9] shrink-0" /> 3% Commission Fee</li>
            </ul>
            <Link href={`/signup/consultant?plan=growth&billing=${isAnnual ? 'annual' : 'monthly'}`} className="w-full py-4 px-4 bg-[#2FA4A9] text-white font-bold rounded-xl text-center hover:bg-[#258a8f] transition shadow-lg shadow-[#2FA4A9]/20 relative z-10 cursor-pointer">Start Growing</Link>
          </div>

          {/* PRO PLAN */}
          <div className="bg-white rounded-3xl p-8 border border-gray-200 flex flex-col hover:border-[#0F2A44] transition duration-300 relative overflow-hidden">
            {isAnnual && (
              <div className="absolute top-0 right-0 left-0 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest py-1.5 px-4 text-center flex justify-center items-center gap-1.5 shadow-sm z-10">
                 <AlertCircle className="w-3 h-3" /> Special 89% OFF Launch Rate
              </div>
            )}
            <div className={`mb-6 ${isAnnual ? 'mt-4' : ''} relative z-10`}>
              <div className="flex justify-between items-start mb-2">
                 <h3 className="text-xl font-bold text-gray-900">Pro</h3>
              </div>
              <div className="font-serif flex items-end gap-1">
                {isAnnual && <span className="text-2xl font-black text-gray-300 line-through mb-1 mr-1">$199</span>}
                <span className={`text-4xl font-black ${isAnnual ? 'text-red-600' : 'text-[#0F2A44]'}`}>{isAnnual ? '$21' : '$199'}</span>
                <span className="text-gray-400 font-medium mb-1">/mo</span>
              </div>
              <div className="h-5 mt-1">
                {isAnnual ? (
                  <span className="text-[9px] font-bold text-red-600 uppercase tracking-widest flex items-center gap-1">
                    Billed $252/yr (Reverts to 55%)
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-transparent select-none">-</span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-2 font-medium">For established firms and agencies.</p>
            </div>
            
            {isAnnual && (
              <div className="bg-red-50 border border-red-100 p-3 rounded-xl mb-6 text-center relative z-10 shadow-sm animate-pulse duration-1000">
                <p className="text-[10px] font-black uppercase text-red-800 tracking-widest">Early Adopter Bonus</p>
                <p className="text-xs text-red-600 font-bold mt-1 leading-snug">Only available for the first 100 consultants. Then drops to 55% OFF.</p>
              </div>
            )}

            <ul className="space-y-4 mb-8 flex-1 text-[15px] font-medium text-gray-600 relative z-10">
              <li className="flex items-start gap-3"><Check className="w-5 h-5 text-[#2FA4A9] shrink-0" /> Maximum Search Dominance</li>
              <li className="flex items-start gap-3"><Check className="w-5 h-5 text-[#2FA4A9] shrink-0" /> Custom Branding & Domain</li>
              <li className="flex items-start gap-3"><Check className="w-5 h-5 text-[#2FA4A9] shrink-0" /> Firm-level Lead Tracking</li>
              <li className="flex items-start gap-3 bg-gray-900 p-2 rounded-lg text-white font-bold mt-auto"><Target className="w-5 h-5 text-gray-400 shrink-0" /> 0% Commission Fee</li>
            </ul>

            <Link href={`/signup/consultant?plan=pro&billing=${isAnnual ? 'annual' : 'monthly'}`} className="w-full py-3 px-4 bg-gray-900 text-white font-bold rounded-xl text-center hover:bg-black transition shadow-lg relative z-10 cursor-pointer">Go Professional</Link>
          </div>

        </div>
      </div>
    </section>
  );
}
