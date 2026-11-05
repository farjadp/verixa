"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Percent } from "lucide-react";

export type PricingPlan = {
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
  plans: PricingPlan[];
  billingMode: "monthly" | "yearly" | "both";
}

// Feature bullets per plan slug (marketing copy; the full matrix is in the comparison table).
const PLAN_BULLETS: Record<string, string[]> = {
  free: ["Basic Verixa profile", "Standard search visibility", "Booking enabled"],
  starter: ["Boosted search visibility", "Review responses enabled", "Basic analytics"],
  growth: ["High search visibility", "Featured placements", "Competitor ads removed"],
  pro: ["Maximum search visibility", "Custom branding & domain", "Firm-level lead tracking"],
};

const dollars = (cents: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(cents / 100);

/** Percentage saved by paying yearly instead of 12 × monthly; null when there is no saving. */
export function annualDiscount(plan: Pick<PricingPlan, "priceCents" | "yearlyPriceCents">): number | null {
  if (!plan.yearlyPriceCents || plan.priceCents === 0) return null;
  const annual = plan.priceCents * 12;
  const save = annual - plan.yearlyPriceCents;
  return save > 0 ? Math.round((save / annual) * 100) : null;
}

export default function PricingTiers({ plans, billingMode }: Props) {
  const [isAnnual, setIsAnnual] = useState(billingMode !== "monthly");
  const showToggle = billingMode === "both";
  const maxDiscount = Math.max(0, ...plans.map((p) => annualDiscount(p) ?? 0));

  return (
    <section className="bg-mist py-16 lg:py-24" aria-labelledby="plans-heading">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mb-12 flex flex-col items-center gap-4 text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-teal">Plans</span>
          <h2 id="plans-heading" className="text-3xl font-bold tracking-tight text-navy md:text-4xl">
            Pick the plan that fits your practice
          </h2>
          <p className="max-w-2xl text-lg text-gray-600">
            Every plan includes licence verification and escrow-protected bookings. Higher tiers lower the platform fee.
          </p>

          {showToggle && (
            <div className="mt-2 flex flex-col items-center gap-3">
              <div className="relative inline-grid w-72 grid-cols-2 rounded-full border border-gray-200 bg-white p-1" role="group" aria-label="Billing period">
                <span
                  className={`pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-navy transition-transform duration-300 ${
                    isAnnual ? "translate-x-full" : "translate-x-0"
                  }`}
                  aria-hidden="true"
                />
                <button
                  type="button"
                  onClick={() => setIsAnnual(false)}
                  aria-pressed={!isAnnual}
                  className={`relative z-10 min-h-11 rounded-full text-sm font-bold transition-colors ${!isAnnual ? "text-white" : "text-gray-600 hover:text-navy"}`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setIsAnnual(true)}
                  aria-pressed={isAnnual}
                  className={`relative z-10 min-h-11 rounded-full text-sm font-bold transition-colors ${isAnnual ? "text-white" : "text-gray-600 hover:text-navy"}`}
                >
                  Annually
                </button>
              </div>
              {maxDiscount > 0 && (
                <p className="text-sm font-semibold text-gray-600">
                  Save up to <span className="font-bold text-success">{maxDiscount}%</span> with annual billing
                </p>
              )}
            </div>
          )}
        </div>

        <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const featured = plan.isRecommended;
            const discount = annualDiscount(plan);
            const yearly = plan.yearlyPriceCents ?? plan.priceCents * 12;
            const annualActive = isAnnual && plan.priceCents > 0;
            const perMonth = annualActive && plan.yearlyPriceCents ? Math.round(plan.yearlyPriceCents / 12) : plan.priceCents;
            const bullets = PLAN_BULLETS[plan.slug] ?? [];
            const href =
              plan.priceCents === 0
                ? "/register"
                : `/register?plan=${encodeURIComponent(plan.slug)}&billing=${isAnnual ? "annual" : "monthly"}`;

            return (
              <li
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border p-6 lg:p-8 ${
                  featured ? "border-navy bg-navy text-white shadow-2xl shadow-navy/20" : "border-gray-200 bg-white"
                }`}
              >
                {featured && (
                  <span className="absolute -top-3 left-6 rounded-full bg-teal px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                    Recommended
                  </span>
                )}

                <div className="flex items-start justify-between gap-2">
                  <h3 className={`text-xl font-bold ${featured ? "text-white" : "text-navy"}`}>{plan.name}</h3>
                  {annualActive && showToggle && discount && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        featured ? "bg-white/15 text-white" : "bg-success/10 text-success"
                      }`}
                    >
                      Save {discount}%
                    </span>
                  )}
                </div>
                {plan.description && (
                  <p className={`mt-1 text-sm ${featured ? "text-white/80" : "text-gray-600"}`}>{plan.description}</p>
                )}

                <div className="mt-6 flex items-end gap-2">
                  {annualActive && showToggle && discount && (
                    <span className={`mb-1 text-lg font-bold line-through ${featured ? "text-white/50" : "text-gray-400"}`}>
                      {dollars(plan.priceCents)}
                    </span>
                  )}
                  <span className={`text-4xl font-bold tracking-tight ${featured ? "text-white" : "text-navy"}`}>
                    {dollars(perMonth)}
                  </span>
                  <span className={`mb-1 text-sm font-medium ${featured ? "text-white/70" : "text-gray-500"}`}>/mo</span>
                </div>
                <p className={`mt-1 min-h-5 text-xs font-semibold ${featured ? "text-lightteal" : "text-gray-500"}`}>
                  {annualActive ? `Billed ${dollars(yearly)} per year` : plan.priceCents > 0 ? "Billed monthly" : "No card required"}
                </p>

                <ul className={`mt-6 flex flex-1 flex-col gap-3 text-sm ${featured ? "text-white/90" : "text-gray-700"}`}>
                  {bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3">
                      <Check className={`mt-0.5 h-4 w-4 shrink-0 ${featured ? "text-lightteal" : "text-teal"}`} aria-hidden="true" />
                      {bullet}
                    </li>
                  ))}
                </ul>

                <p
                  className={`mt-6 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${
                    featured ? "bg-white/10 text-white" : "bg-mist text-navy"
                  }`}
                >
                  <Percent className="h-4 w-4" aria-hidden="true" />
                  {plan.commission}% platform fee per booking
                </p>

                <Link
                  href={href}
                  className={`mt-4 flex min-h-12 items-center justify-center rounded-xl text-sm font-bold transition-colors ${
                    featured
                      ? "bg-teal text-white hover:bg-white hover:text-navy"
                      : "border border-navy bg-white text-navy hover:bg-navy hover:text-white"
                  }`}
                >
                  {plan.priceCents === 0 ? "Start free" : `Choose ${plan.name}`}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
