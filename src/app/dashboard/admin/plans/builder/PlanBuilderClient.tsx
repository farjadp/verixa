"use client";
// ============================================================================
// PlanBuilderClient.tsx
// Version: 1.0.0 — 2026-03-25
// Why: Interactive feature × plan matrix. Admin toggles cells to configure
//      what each plan can access, with real-time DB saves.
// ============================================================================

import { useState, useTransition } from "react";
import { updatePlanFeature } from "@/actions/plans.actions";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

const PLAN_COLORS: Record<string, string> = {
  free:    "border-gray-200 bg-gray-50 text-gray-700",
  starter: "border-blue-200 bg-blue-50 text-blue-700",
  growth:  "border-teal-200 bg-teal-50 text-teal-700",
  pro:     "border-[#0F2A44]/20 bg-[#0F2A44]/5 text-[#0F2A44]",
};

const CATEGORY_ICONS: Record<string, string> = {
  visibility: "👁️",
  trust:      "🛡️",
  booking:    "📅",
  analytics:  "📊",
  financial:  "💰",
  premium:    "⭐",
};

type Plan = {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  commission: number;
  planFeatures: { featureId: string; enabled: boolean; value: string | null }[];
};

type Feature = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  type: string;
};

interface Props {
  plans: Plan[];
  features: Feature[];
  categories: string[];
}

export default function PlanBuilderClient({ plans, features, categories }: Props) {
  // Build a mutable state map: { [planId_featureId]: { enabled, value } }
  const initialState: Record<string, { enabled: boolean; value: string | null }> = {};
  for (const plan of plans) {
    for (const pf of plan.planFeatures) {
      initialState[`${plan.id}_${pf.featureId}`] = { enabled: pf.enabled, value: pf.value };
    }
  }

  const [matrix, setMatrix] = useState(initialState);
  const [saving, setSaving] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const getCell = (planId: string, featureId: string) =>
    matrix[`${planId}_${featureId}`] ?? { enabled: false, value: null };

  const toggleBoolean = (planId: string, featureId: string) => {
    const cellKey = `${planId}_${featureId}`;
    const current = getCell(planId, featureId);
    const newEnabled = !current.enabled;

    setMatrix((prev) => ({ ...prev, [cellKey]: { ...current, enabled: newEnabled } }));
    setSaving(cellKey);

    startTransition(async () => {
      await updatePlanFeature(planId, featureId, { enabled: newEnabled, value: current.value });
      setSaving(null);
    });
  };

  const updateValue = (planId: string, featureId: string, value: string) => {
    const cellKey = `${planId}_${featureId}`;
    const current = getCell(planId, featureId);

    setMatrix((prev) => ({ ...prev, [cellKey]: { ...current, value: value || null } }));
    setSaving(cellKey);

    startTransition(async () => {
      await updatePlanFeature(planId, featureId, { enabled: current.enabled, value: value || null });
      setSaving(null);
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
      {/* TABLE HEADER */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left p-5 text-sm font-bold text-gray-500 w-64 min-w-[256px]">Feature</th>
              {plans.map((plan) => (
                <th key={plan.id} className={`text-center p-5 min-w-[140px]`}>
                  <div className={`inline-flex flex-col items-center gap-1.5 px-4 py-2 rounded-xl border ${PLAN_COLORS[plan.slug] ?? "border-gray-200 bg-gray-50"}`}>
                    <span className="text-sm font-black">{plan.name}</span>
                    <span className="text-[10px] font-bold opacity-70">
                      {plan.priceCents === 0 ? "Free" : `$${(plan.priceCents / 100).toFixed(0)}/mo`}
                    </span>
                    <span className="text-[10px] font-medium opacity-60">{plan.commission}% commission</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {categories.map((category) => {
              const categoryFeatures = features.filter((f) => f.category === category);

              return (
                <>
                  {/* Category row */}
                  <tr key={`cat-${category}`} className="bg-[#F8F9FB]">
                    <td colSpan={plans.length + 1} className="px-5 py-2.5">
                      <span className="text-[11px] font-black uppercase tracking-widest text-[#2FA4A9]">
                        {CATEGORY_ICONS[category] ?? "🔧"} {category}
                      </span>
                    </td>
                  </tr>

                  {/* Feature rows */}
                  {categoryFeatures.map((feature, idx) => (
                    <tr
                      key={feature.id}
                      className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${idx % 2 === 0 ? "" : "bg-gray-50/30"}`}
                    >
                      {/* Feature name */}
                      <td className="p-4 pl-5">
                        <div>
                          <span className="text-sm font-semibold text-[#1A1F2B]">{feature.name}</span>
                          {feature.description && (
                            <p className="text-xs text-gray-400 mt-0.5">{feature.description}</p>
                          )}
                          <span className={`mt-1 inline-block text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${feature.type === "limit" ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600"}`}>
                            {feature.type}
                          </span>
                        </div>
                      </td>

                      {/* Plan cells */}
                      {plans.map((plan) => {
                        const cellKey = `${plan.id}_${feature.id}`;
                        const cell = getCell(plan.id, feature.id);
                        const isSaving = saving === cellKey;

                        return (
                          <td key={plan.id} className="p-4 text-center">
                            {isSaving ? (
                              <Loader2 className="w-5 h-5 animate-spin text-[#2FA4A9] mx-auto" />
                            ) : feature.type === "limit" ? (
                              <input
                                type="text"
                                value={cell.value ?? ""}
                                onChange={(e) => updateValue(plan.id, feature.id, e.target.value)}
                                onBlur={(e) => updateValue(plan.id, feature.id, e.target.value)}
                                placeholder="—"
                                className="w-24 text-center text-sm font-bold text-[#0F2A44] bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 focus:border-[#2FA4A9] focus:outline-none focus:ring-2 focus:ring-[#2FA4A9]/20 mx-auto block"
                              />
                            ) : (
                              <button
                                onClick={() => toggleBoolean(plan.id, feature.id)}
                                className="mx-auto block transition-transform hover:scale-110"
                              >
                                {cell.enabled ? (
                                  <CheckCircle2 className="w-6 h-6 text-teal-500" />
                                ) : (
                                  <XCircle className="w-6 h-6 text-gray-300" />
                                )}
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center gap-6 text-xs text-gray-400">
        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-teal-500" /> Feature enabled</span>
        <span className="flex items-center gap-1.5"><XCircle className="w-4 h-4 text-gray-300" /> Feature disabled</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-4 bg-orange-50 border border-orange-200 rounded text-center text-[10px] text-orange-600">n</span> Limit value (e.g. "3", "unlimited")</span>
        <span className="ml-auto text-[#2FA4A9] font-bold">Changes save instantly ✓</span>
      </div>
    </div>
  );
}
