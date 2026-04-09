"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Target, Zap, AlertCircle } from "lucide-react";

type Plan = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  yearlyPriceCents: number | null;
  commission: number;
  isRecommended: boolean;
};

interface Props {
  plans: Plan[];
  billingMode: "monthly" | "yearly" | "both";
}

export default function PricingTiers({ plans, billingMode }: Props) {
  const [isAnnual, setIsAnnual] = useState(billingMode === "yearly" ? true : billingMode === "monthly" ? false : true);
  const showToggle = billingMode === "both";

  // Calculate annual discount % for a plan
  const getAnnualDiscount = (plan: Plan) => {
    if (!plan.yearlyPriceCents || plan.priceCents === 0) return null;
    const annual = plan.priceCents * 12;
    const save = annual - plan.yearlyPriceCents;
    return save > 0 ? Math.round((save / annual) * 100) : null;
  };

  // Get effective monthly display price
  const getDisplayPrice = (plan: Plan) => {
    if (plan.priceCents === 0) return 0;
    if (isAnnual && plan.yearlyPriceCents) {
      return Math.round(plan.yearlyPriceCents / 12);
    }
    return plan.priceCents;
  };

  const getYearlyTotal = (plan: Plan) => {
    return plan.yearlyPriceCents ?? plan.priceCents * 12;
  };

  // Style map per plan slug
  const planStyles: Record<string, {
    wrapper: string; nameColor: string; priceColor: string;
    ctaClass: string; ctaText: string; commissionBg: string;
    featured?: boolean; elevated?: boolean;
  }> = {
    free: {
      wrapper: "bg-white rounded-3xl p-8 border border-gray-200 flex flex-col hover:border-[#2FA4A9] transition duration-300",
      nameColor: "text-gray-400",
      priceColor: "text-[#0F2A44]",
      ctaClass: "w-full py-3 px-4 bg-gray-100 text-[#0F2A44] font-bold rounded-xl text-center hover:bg-gray-200 transition",
      ctaText: "Get Started",
      commissionBg: "bg-gray-50 p-2 rounded-lg text-[#0F2A44] font-bold",
    },
    starter: {
      wrapper: "bg-white rounded-3xl p-8 border border-gray-200 flex flex-col hover:border-[#0F2A44] transition duration-300 shadow-xl shadow-gray-200/50 relative overflow-hidden",
      nameColor: "text-[#2FA4A9]",
      priceColor: "text-[#0F2A44]",
      ctaClass: "w-full py-3 px-4 bg-white border-2 border-[#0F2A44] text-[#0F2A44] font-bold rounded-xl text-center hover:bg-gray-50 transition",
      ctaText: "Upgrade to Starter",
      commissionBg: "bg-[#2FA4A9]/10 p-2 rounded-lg text-[#0F2A44] font-bold",
    },
    growth: {
      wrapper: "bg-[#0F2A44] rounded-3xl p-8 border border-[#0F2A44] flex flex-col relative shadow-2xl shadow-[#0F2A44]/30 transform lg:-translate-y-4",
      nameColor: "text-[#2FA4A9]",
      priceColor: "text-white",
      ctaClass: "w-full py-4 px-4 bg-[#2FA4A9] text-white font-bold rounded-xl text-center hover:bg-[#258a8f] transition shadow-lg shadow-[#2FA4A9]/20 relative z-10",
      ctaText: "Start Growing",
      commissionBg: "bg-[#1A3855] p-2 rounded-lg text-white font-bold border border-[#2FA4A9]/30",
      featured: true,
      elevated: true,
    },
    pro: {
      wrapper: "bg-white rounded-3xl p-8 border border-gray-200 flex flex-col hover:border-[#0F2A44] transition duration-300 relative overflow-hidden",
      nameColor: "text-gray-900",
      priceColor: "text-[#0F2A44]",
      ctaClass: "w-full py-3 px-4 bg-gray-900 text-white font-bold rounded-xl text-center hover:bg-black transition shadow-lg relative z-10",
      ctaText: "Go Professional",
      commissionBg: "bg-gray-900 p-2 rounded-lg text-white font-bold",
    },
  };

  // Feature bullets per plan slug
  const planBullets: Record<string, string[]> = {
    free: ["Basic Verixa Profile", "Standard Search Visibility", "Booking Enabled"],
    starter: ["Boosted Search Visibility", "Review Responses Enabled", "Basic Analytics"],
    growth: ["High Search Visibility", "Featured Placements", "Competitor Ads Removed"],
    pro: ["Maximum Search Dominance", "Custom Branding & Domain", "Firm-level Lead Tracking"],
  };

  const bulletColor: Record<string, string> = {
    free: "text-[#2FA4A9]",
    starter: "text-[#2FA4A9]",
    growth: "text-[#2FA4A9]",
    pro: "text-[#2FA4A9]",
  };

  const textColor: Record<string, string> = {
    free: "text-gray-600",
    starter: "text-gray-600",
    growth: "text-gray-300",
    pro: "text-gray-600",
  };

  const descColor: Record<string, string> = {
    free: "text-gray-500",
    starter: "text-gray-500",
    growth: "text-gray-300",
    pro: "text-gray-500",
  };

  // Pro special annual display (89% OFF launch)
  const proAnnualDisplayPrice = 21; // $21/mo when billed annually at $252/yr

  return (
    <section className="py-24 bg-[#F5F7FA]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-[#0F2A44] mb-4">Choose Your Growth Trajectory</h2>
          <p className="text-gray-500 text-lg mb-8">Invest in your digital infrastructure. Upgrade to lower commissions and higher visibility.</p>

          {/* TOGGLE — only shown in "both" billing mode */}
          {showToggle && (
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="bg-white p-1.5 rounded-full border border-gray-200 inline-flex items-center shadow-sm relative w-[300px]">
                <div
                  className="absolute top-1.5 bottom-1.5 w-[calc(50%-0.375rem)] bg-[#0F2A44] rounded-full transition-transform duration-300 shadow-md pointer-events-none"
                  style={{ transform: isAnnual ? "translateX(100%)" : "translateX(0%)" }}
                />
                <button
                  onClick={() => setIsAnnual(false)}
                  className={`relative z-10 w-1/2 py-3 rounded-full text-sm font-bold transition-colors ${!isAnnual ? "text-white" : "text-gray-500 hover:text-[#0F2A44]"}`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setIsAnnual(true)}
                  className={`relative z-10 w-1/2 py-3 rounded-full text-sm font-bold transition-colors flex items-center justify-center gap-2 ${isAnnual ? "text-white" : "text-gray-500 hover:text-[#0F2A44]"}`}
                >
                  Annually
                </button>
              </div>

              <div className="inline-flex items-center gap-1.5 bg-green-100 border border-green-200 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                <Zap className="w-3 h-3" /> Save up to 89% with Annual
              </div>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const style = planStyles[plan.slug] ?? planStyles.free;
            const annualDiscount = getAnnualDiscount(plan);
            const displayPriceCents = getDisplayPrice(plan);
            const displayPrice = displayPriceCents / 100;
            const yearlyTotal = getYearlyTotal(plan) / 100;
            const bullets = planBullets[plan.slug] ?? [];
            const isProAnnual = plan.slug === "pro" && isAnnual;
            const monthlyOrig = plan.priceCents / 100;

            return (
              <div key={plan.id} className={style.wrapper}>
                {/* GROWTH: Most Popular Badge */}
                {style.featured && (
                  <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-[#2FA4A9] text-white text-xs font-black uppercase tracking-widest py-1 px-4 rounded-full whitespace-nowrap z-10">
                    Most Popular
                  </div>
                )}

                {/* PRO: Launch Rate Banner (annual) */}
                {isProAnnual && (
                  <div className="absolute top-0 right-0 left-0 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest py-1.5 px-4 text-center flex justify-center items-center gap-1.5 shadow-sm z-10">
                    <AlertCircle className="w-3 h-3" /> Special 89% OFF Launch Rate
                  </div>
                )}

                {/* PLAN HEADER */}
                <div className={`mb-6 relative z-10 ${isProAnnual ? "mt-4" : ""}`}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className={`text-xl font-bold ${style.nameColor}`}>{plan.name}</h3>
                    {isAnnual && showToggle && annualDiscount && plan.slug !== "pro" && (
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        plan.slug === "growth" ? "bg-white/20 text-white" : "bg-[#2FA4A9]/10 text-[#2FA4A9]"
                      }`}>
                        {annualDiscount}% OFF
                      </span>
                    )}
                  </div>

                  {/* PRICE */}
                  <div className="font-serif flex items-end gap-1">
                    {/* Strikethrough original for annual */}
                    {isAnnual && showToggle && plan.priceCents > 0 && !isProAnnual && (
                      <span className={`text-2xl font-black line-through mb-1 mr-1 ${plan.slug === "growth" ? "text-gray-500 opacity-60" : "text-gray-300"}`}>
                        ${monthlyOrig.toFixed(0)}
                      </span>
                    )}
                    {isProAnnual && (
                      <span className="text-2xl font-black text-gray-300 line-through mb-1 mr-1">${monthlyOrig.toFixed(0)}</span>
                    )}

                    <span className={`text-4xl font-black ${isProAnnual ? "text-red-600" : style.priceColor}`}>
                      {plan.priceCents === 0
                        ? "$0"
                        : isProAnnual
                        ? `$${proAnnualDisplayPrice}`
                        : `$${displayPrice.toFixed(0)}`}
                    </span>
                    <span className={`font-medium mb-1 ${plan.slug === "growth" ? "text-gray-400" : "text-gray-400"}`}>/mo</span>
                  </div>

                  {/* Annual billing line */}
                  <div className="h-5 mt-1">
                    {(isAnnual || billingMode === "yearly") && plan.priceCents > 0 ? (
                      isProAnnual ? (
                        <span className="text-[9px] font-bold text-red-600 uppercase tracking-widest">
                          Billed $252/yr (Reverts to 55%)
                        </span>
                      ) : (
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${plan.slug === "growth" ? "text-[#2FA4A9]" : "text-gray-400"}`}>
                          Billed ${yearlyTotal.toFixed(0)}/yr
                        </span>
                      )
                    ) : (
                      <span className="text-[10px] font-bold text-transparent select-none">-</span>
                    )}
                  </div>

                  <p className={`text-sm mt-2 font-medium ${descColor[plan.slug] ?? "text-gray-500"}`}>
                    {plan.description}
                  </p>
                </div>

                {/* PRO: Early Adopter Bonus */}
                {isProAnnual && (
                  <div className="bg-red-50 border border-red-100 p-3 rounded-xl mb-6 text-center relative z-10 shadow-sm animate-pulse duration-1000">
                    <p className="text-[10px] font-black uppercase text-red-800 tracking-widest">Early Adopter Bonus</p>
                    <p className="text-xs text-red-600 font-bold mt-1 leading-snug">Only available for the first 100 consultants. Then drops to 55% OFF.</p>
                  </div>
                )}

                {/* FEATURE BULLETS */}
                <ul className={`space-y-4 mb-8 flex-1 text-[15px] font-medium ${textColor[plan.slug] ?? "text-gray-600"} relative z-10`}>
                  {bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3">
                      <Check className={`w-5 h-5 shrink-0 ${bulletColor[plan.slug]}`} />
                      {bullet}
                    </li>
                  ))}
                  {/* Commission pill */}
                  <li className={`flex items-start gap-3 ${style.commissionBg} mt-auto`}>
                    <Target className={`w-5 h-5 shrink-0 ${plan.slug === "pro" ? "text-gray-400" : plan.slug === "growth" ? "text-[#2FA4A9]" : "text-gray-400"}`} />
                    {plan.commission}% Commission Fee
                  </li>
                </ul>

                {/* CTA */}
                <Link
                  href={plan.priceCents === 0
                    ? "/signup/consultant"
                    : `/signup/consultant?plan=${plan.slug}&billing=${isAnnual ? "annual" : "monthly"}`}
                  className={`${style.ctaClass} cursor-pointer`}
                >
                  {style.ctaText}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
