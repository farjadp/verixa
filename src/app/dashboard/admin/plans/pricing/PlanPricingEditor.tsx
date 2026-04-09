"use client";
// ============================================================================
// PlanPricingEditor.tsx
// Version: 1.0.0 — 2026-03-25
// Why: Full pricing control for admins:
//       - Edit monthly price per plan
//       - Edit yearly price per plan (with auto-discount calculation)
//       - Edit commission per plan
//       - Toggle billing mode: monthly | yearly | both
// ============================================================================

import { useState, useTransition } from "react";
import { updatePlan } from "@/actions/plans.actions";
import { updateBillingMode } from "@/actions/settings.actions";
import { Loader2, Check, DollarSign, Calendar, Zap } from "lucide-react";
import { useRouter } from "next/navigation";

type Plan = {
  id: string; name: string; slug: string; priceCents: number;
  yearlyPriceCents: number | null; commission: number; isActive: boolean; isRecommended: boolean;
};

interface Props {
  plans: Plan[];
  initialBillingMode: "monthly" | "yearly" | "both";
}

const PLAN_ACCENT: Record<string, string> = {
  free:    "border-gray-200 bg-gray-50",
  starter: "border-blue-200 bg-blue-50/40",
  growth:  "border-teal-200 bg-teal-50/40",
  pro:     "border-[#0F2A44]/20 bg-[#0F2A44]/5",
};

function centsToStr(cents: number) {
  return (cents / 100).toFixed(2);
}
function strToCents(val: string): number {
  const n = parseFloat(val.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : Math.round(n * 100);
}

export default function PlanPricingEditor({ plans, initialBillingMode }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Local state for editable fields
  const [rows, setRows] = useState(
    plans.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      monthly: centsToStr(p.priceCents),
      yearly: p.yearlyPriceCents != null ? centsToStr(p.yearlyPriceCents) : centsToStr(p.priceCents * 10), // default: 10× = 2 months free
      commission: String(p.commission),
      isRecommended: p.isRecommended,
      isActive: p.isActive,
      saving: false,
      saved: false,
    }))
  );
  const [billingMode, setBillingMode] = useState(initialBillingMode);
  const [modeLoading, setModeLoading] = useState(false);

  const updateRow = (id: string, field: string, value: string | boolean) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const saveRow = async (id: string) => {
    const row = rows.find((r) => r.id === id);
    if (!row) return;

    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, saving: true, saved: false } : r)));

    await updatePlan(id, {
      priceCents: strToCents(row.monthly),
      yearlyPriceCents: strToCents(row.yearly),
      commission: parseInt(row.commission) || 0,
      isRecommended: row.isRecommended,
      isActive: row.isActive,
    });

    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, saving: false, saved: true } : r)));
    setTimeout(() => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, saved: false } : r))), 2000);
    router.refresh();
  };

  const handleBillingMode = async (mode: "monthly" | "yearly" | "both") => {
    setBillingMode(mode);
    setModeLoading(true);
    await updateBillingMode(mode);
    setModeLoading(false);
  };

  // Calculate yearly discount % for display
  const yearlyDiscount = (monthly: string, yearly: string) => {
    const m = strToCents(monthly);
    const y = strToCents(yearly);
    if (!m || !y) return null;
    const annual = m * 12;
    const save = annual - y;
    return save > 0 ? Math.round((save / annual) * 100) : null;
  };

  return (
    <div className="space-y-6">

      {/* BILLING MODE */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-[#0F2A44]">Billing Period Display</h2>
            <p className="text-xs text-gray-400 mt-0.5">Choose which pricing options are visible to consultants on the pricing page.</p>
          </div>
          {modeLoading && <Loader2 className="w-4 h-4 animate-spin text-[#2FA4A9]" />}
        </div>

        <div className="flex gap-3 flex-wrap">
          {(["monthly", "yearly", "both"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => handleBillingMode(mode)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                billingMode === mode
                  ? "border-[#2FA4A9] bg-[#E5F5F5] text-[#2FA4A9]"
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
              }`}
            >
              {mode === "monthly" && <>{/* month icon */}<Calendar className="w-4 h-4" /> Monthly only</>}
              {mode === "yearly"  && <><Calendar className="w-4 h-4" /> Yearly only</>}
              {mode === "both"    && <><Zap className="w-4 h-4" /> Show both (toggle)</>}
            </button>
          ))}
        </div>

        <div className={`mt-4 text-xs px-3 py-2 rounded-lg ${
          billingMode === "monthly" ? "bg-blue-50 text-blue-700" :
          billingMode === "yearly"  ? "bg-green-50 text-green-700" :
          "bg-teal-50 text-teal-700"
        }`}>
          {billingMode === "monthly" && "📅 Only monthly pricing is shown. Yearly column hidden on pricing page."}
          {billingMode === "yearly"  && "🗓️ Only yearly pricing is shown. Monthly column hidden on pricing page."}
          {billingMode === "both"    && "⚡ Users see a monthly/yearly toggle. Both prices displayed."}
        </div>
      </div>

      {/* PRICE EDITOR TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-[#0F2A44]">Plan Prices & Commission</h2>
          <p className="text-xs text-gray-400 mt-0.5">Edit and save each plan independently. Prices in CAD.</p>
        </div>

        <div className="divide-y divide-gray-100">
          {rows.map((row) => {
            const discount = yearlyDiscount(row.monthly, row.yearly);
            return (
              <div key={row.id} className={`p-6 ${PLAN_ACCENT[row.slug] ?? "bg-white"}`}>
                <div className="flex items-start justify-between gap-6">
                  <div className="w-28 shrink-0">
                    <div className="font-black text-lg text-[#0F2A44]">{row.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{row.slug}</div>
                  </div>

                  <div className="flex-1 grid grid-cols-3 gap-4">
                    {/* Monthly price */}
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                        Monthly Price (CAD)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.monthly}
                          onChange={(e) => updateRow(row.id, "monthly", e.target.value)}
                          disabled={row.slug === "free"}
                          className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm font-bold focus:border-[#2FA4A9] focus:outline-none focus:ring-2 focus:ring-[#2FA4A9]/20 disabled:bg-gray-50 disabled:text-gray-400"
                        />
                      </div>
                      {row.slug !== "free" && (
                        <p className="text-[10px] text-gray-400 mt-1">${(parseFloat(row.monthly) || 0).toFixed(2)} / month</p>
                      )}
                    </div>

                    {/* Yearly price */}
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                        Yearly Price (CAD)
                        {discount != null && <span className="ml-1.5 text-teal-600 font-black">−{discount}%</span>}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={row.yearly}
                          onChange={(e) => updateRow(row.id, "yearly", e.target.value)}
                          disabled={row.slug === "free"}
                          className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm font-bold focus:border-[#2FA4A9] focus:outline-none focus:ring-2 focus:ring-[#2FA4A9]/20 disabled:bg-gray-50 disabled:text-gray-400"
                        />
                      </div>
                      {row.slug !== "free" && (
                        <p className="text-[10px] text-gray-400 mt-1">
                          ${(parseFloat(row.yearly) || 0).toFixed(0)} / year = ${((parseFloat(row.yearly) || 0) / 12).toFixed(2)}/mo
                        </p>
                      )}
                    </div>

                    {/* Commission */}
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                        Commission (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max="100"
                          value={row.commission}
                          onChange={(e) => updateRow(row.id, "commission", e.target.value)}
                          className="w-full pr-8 pl-3 py-2.5 border border-gray-200 rounded-xl text-sm font-bold focus:border-[#2FA4A9] focus:outline-none focus:ring-2 focus:ring-[#2FA4A9]/20"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">Platform fee on bookings</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <button
                      onClick={() => saveRow(row.id)}
                      disabled={row.saving}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        row.saved
                          ? "bg-teal-500 text-white"
                          : "bg-[#0F2A44] text-white hover:bg-black"
                      } disabled:opacity-50 mb-2`}
                    >
                      {row.saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : row.saved ? (
                        <><Check className="w-4 h-4" /> Saved!</>
                      ) : (
                        <><DollarSign className="w-4 h-4" /> Save</>
                      )}
                    </button>

                    {/* Active toggle */}
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-500 font-medium select-none">
                      <input
                        type="checkbox"
                        checked={row.isActive}
                        onChange={(e) => updateRow(row.id, "isActive", e.target.checked)}
                        className="accent-[#2FA4A9] rounded"
                        disabled={row.slug === "free"}
                      />
                      Active Plan
                    </label>

                    {/* Recommended badge toggle */}
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-500 font-medium select-none">
                      <input
                        type="checkbox"
                        checked={row.isRecommended}
                        onChange={(e) => updateRow(row.id, "isRecommended", e.target.checked)}
                        className="accent-[#2FA4A9] rounded"
                      />
                      Recommended Badge
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* HINT */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
        <span className="text-base">💡</span>
        <div>
          <strong>Tip:</strong> Yearly prices are paid upfront. A common approach is <em>monthly × 10</em> (2 months free).
          The discount % shown to users is auto-calculated from your monthly vs yearly input.
        </div>
      </div>
    </div>
  );
}
