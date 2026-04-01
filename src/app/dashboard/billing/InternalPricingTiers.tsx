"use client";

import { useState } from "react";
import { Check, Target, Zap, AlertCircle } from "lucide-react";
import { createUpgradeCheckoutSession } from "@/actions/checkout.actions";
import { useRouter } from "next/navigation";

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
  currentPlanId?: string | null;
  hasStripeCustomer?: boolean;
}

export default function InternalPricingTiers({ plans, billingMode, currentPlanId, hasStripeCustomer }: Props) {
  const router = useRouter();
  const [isAnnual, setIsAnnual] = useState(billingMode === "yearly" ? true : billingMode === "monthly" ? false : true);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const showToggle = billingMode === "both";

  const getAnnualDiscount = (plan: Plan) => {
    if (!plan.yearlyPriceCents || plan.priceCents === 0) return null;
    const annual = plan.priceCents * 12;
    const save = annual - plan.yearlyPriceCents;
    return save > 0 ? Math.round((save / annual) * 100) : null;
  };

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

  const planStyles: any = {
    free: {
      wrapper: "bg-white rounded-3xl p-8 border border-gray-200 flex flex-col hover:border-[#2FA4A9] transition duration-300",
      nameColor: "text-gray-400",
      priceColor: "text-[#0F2A44]",
      ctaClass: "w-full py-3 px-4 bg-gray-100 text-[#0F2A44] font-bold rounded-xl text-center hover:bg-gray-200 transition",
      ctaText: "Current Plan",
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

  const planBullets: any = {
    free: ["Basic Verixa Profile", "Standard Search Visibility", "Booking Enabled"],
    starter: ["Boosted Search Visibility", "Review Responses Enabled", "Basic Analytics"],
    growth: ["High Search Visibility", "Featured Placements", "Competitor Ads Removed"],
    pro: ["Maximum Search Dominance", "Custom Branding & Domain", "Firm-level Lead Tracking"],
  };

  const bulletColor: any = {
    free: "text-[#2FA4A9]",
    starter: "text-[#2FA4A9]",
    growth: "text-[#2FA4A9]",
    pro: "text-[#2FA4A9]",
  };

  const textColor: any = {
    free: "text-gray-600",
    starter: "text-gray-600",
    growth: "text-gray-300",
    pro: "text-gray-600",
  };

  const descColor: any = {
    free: "text-gray-500",
    starter: "text-gray-500",
    growth: "text-gray-300",
    pro: "text-gray-500",
  };

  const proAnnualDisplayPrice = 21;

  async function handleUpgrade(planId: string, slug: string, price: number) {
    if (price === 0) return; // Free plan downgrade not supported directly via stripe checkout

    setLoadingPlan(planId);
    try {
      const { success, url, error } = await createUpgradeCheckoutSession(planId, isAnnual);
      if (success && url) {
        router.push(url);
      } else {
        alert("Failed to initiate checkout: " + error);
      }
    } catch (e: any) {
      alert("Error Checkout: " + e.message);
    } finally {
      setLoadingPlan(null);
    }
  }

  async function handleManageSubscription() {
    setLoadingPortal(true);
    try {
      const { createCustomerPortalSession } = await import("@/actions/checkout.actions");
      const { success, url, error } = await createCustomerPortalSession();
      if (success && url) {
        router.push(url);
      } else {
        alert("Failed to open billing portal: " + error);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setLoadingPortal(false);
    }
  }

  return (
    <div>
      {showToggle && (
        <div className="flex flex-col items-center justify-center gap-4 mb-16">
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

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const style = planStyles[plan.slug] ?? planStyles.free;
          const displayPriceCents = getDisplayPrice(plan);
          const displayPrice = displayPriceCents / 100;
          const yearlyTotal = getYearlyTotal(plan) / 100;
          const bullets = planBullets[plan.slug] ?? [];
          const isProAnnual = plan.slug === "pro" && isAnnual;
          const monthlyOrig = plan.priceCents / 100;
          const isActive = currentPlanId === plan.id;
          const annualDiscount = getAnnualDiscount(plan);

          return (
             <div key={plan.id} className={style.wrapper}>
                {style.featured && (
                  <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-[#2FA4A9] text-white text-xs font-black uppercase tracking-widest py-1 px-4 rounded-full whitespace-nowrap z-10">
                    Most Popular
                  </div>
                )}
                {isProAnnual && (
                  <div className="absolute top-0 right-0 left-0 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest py-1.5 px-4 text-center flex justify-center items-center gap-1.5 shadow-sm z-10">
                    <AlertCircle className="w-3 h-3" /> Special 89% OFF Launch Rate
                  </div>
                )}

                <div className={`mb-6 relative z-10 ${isProAnnual ? "mt-4" : ""}`}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className={`text-xl font-bold ${style.nameColor}`}>{plan.name}</h3>
                    {isAnnual && showToggle && annualDiscount && plan.slug !== "pro" && (
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${plan.slug === "growth" ? "bg-white/20 text-white" : "bg-[#2FA4A9]/10 text-[#2FA4A9]"}`}>
                        {annualDiscount}% OFF
                      </span>
                    )}
                  </div>

                  <div className="font-serif flex items-end gap-1">
                    {isAnnual && showToggle && plan.priceCents > 0 && !isProAnnual && (
                      <span className={`text-2xl font-black line-through mb-1 mr-1 ${plan.slug === "growth" ? "text-gray-500 opacity-60" : "text-gray-300"}`}>
                        ${monthlyOrig.toFixed(0)}
                      </span>
                    )}
                    {isProAnnual && <span className="text-2xl font-black text-gray-300 line-through mb-1 mr-1">${monthlyOrig.toFixed(0)}</span>}

                    <span className={`text-4xl font-black ${isProAnnual ? "text-red-600" : style.priceColor}`}>
                      {plan.priceCents === 0 ? "$0" : isProAnnual ? `$${proAnnualDisplayPrice}` : `$${displayPrice.toFixed(0)}`}
                    </span>
                    <span className={`font-medium mb-1 ${plan.slug === "growth" ? "text-gray-400" : "text-gray-400"}`}>/mo</span>
                  </div>

                  <div className="h-5 mt-1">
                    {(isAnnual || billingMode === "yearly") && plan.priceCents > 0 ? (
                      isProAnnual ? <span className="text-[9px] font-bold text-red-600 uppercase tracking-widest">Billed $252/yr (Reverts to 55%)</span> :
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${plan.slug === "growth" ? "text-[#2FA4A9]" : "text-gray-400"}`}>Billed ${yearlyTotal.toFixed(0)}/yr</span>
                    ) : <span className="text-[10px] font-bold text-transparent select-none">-</span>}
                  </div>

                  <p className={`text-sm mt-2 font-medium ${descColor[plan.slug] ?? "text-gray-500"}`}>{plan.description}</p>
                </div>

                <ul className={`space-y-4 mb-8 flex-1 text-[15px] font-medium ${textColor[plan.slug] ?? "text-gray-600"} relative z-10`}>
                  {bullets.map((b: string) => (
                    <li key={b} className="flex items-start gap-3"><Check className={`w-5 h-5 shrink-0 ${bulletColor[plan.slug]}`} />{b}</li>
                  ))}
                  <li className={`flex items-start gap-3 ${style.commissionBg} mt-auto`}>
                    <Target className={`w-5 h-5 shrink-0 ${plan.slug === "pro" ? "text-gray-400" : plan.slug === "growth" ? "text-[#2FA4A9]" : "text-gray-400"}`} />
                    {plan.commission}% Commission Fee
                  </li>
                </ul>

                {isActive && hasStripeCustomer ? (
                  <button
                     disabled={loadingPortal}
                     onClick={handleManageSubscription}
                     className="w-full py-3 px-4 bg-[#0F2A44] text-white font-bold rounded-xl text-center hover:bg-black transition shadow-sm cursor-pointer"
                  >
                     {loadingPortal ? "Opening Portal..." : "Manage Subscription"}
                  </button>
                ) : (
                  <button
                    disabled={isActive || loadingPlan === plan.id || plan.priceCents === 0}
                    onClick={() => handleUpgrade(plan.id, plan.slug, plan.priceCents)}
                    className={`${style.ctaClass} ${isActive || plan.priceCents === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {loadingPlan === plan.id ? "Processing..." : isActive ? "Current Plan" : style.ctaText}
                  </button>
                )}
             </div>
          );
        })}
      </div>
    </div>
  );
}
