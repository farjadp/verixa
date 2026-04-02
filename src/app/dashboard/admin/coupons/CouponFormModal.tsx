"use client";

import { useState } from "react";
import { X, Tag, Loader2 } from "lucide-react";
import { createCoupon, updateCoupon } from "@/actions/coupon.actions";

type Plan = { id: string; name: string; slug: string; priceCents: number };

type FormState = {
  code: string;
  description: string;
  type: "PERCENT" | "FIXED_CENTS";
  value: string;
  maxUses: string;
  durationMonths: string;
  expiresAt: string;
  startsAt: string;
  allowedPlanIds: string[];
};

export default function CouponFormModal({
  plans,
  existing,
  onClose,
  onSaved,
}: {
  plans: Plan[];
  existing: any | null;
  onClose: () => void;
  onSaved: (coupon: any) => void;
}) {
  const [form, setForm] = useState<FormState>({
    code: existing?.code ?? "",
    description: existing?.description ?? "",
    type: existing?.type ?? "PERCENT",
    value: existing?.value?.toString() ?? "",
    maxUses: existing?.maxUses?.toString() ?? "",
    durationMonths: existing?.durationMonths?.toString() ?? "",
    expiresAt: existing?.expiresAt
      ? new Date(existing.expiresAt).toISOString().split("T")[0]
      : "",
    startsAt: existing?.startsAt
      ? new Date(existing.startsAt).toISOString().split("T")[0]
      : "",
    allowedPlanIds: existing?.allowedPlanIds
      ? JSON.parse(existing.allowedPlanIds)
      : [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (key: keyof FormState, val: any) => setForm((p) => ({ ...p, [key]: val }));

  const togglePlan = (planId: string) => {
    set(
      "allowedPlanIds",
      form.allowedPlanIds.includes(planId)
        ? form.allowedPlanIds.filter((id) => id !== planId)
        : [...form.allowedPlanIds, planId]
    );
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    const payload = {
      code: form.code,
      description: form.description || undefined,
      type: form.type,
      value: parseInt(form.value),
      maxUses: form.maxUses ? parseInt(form.maxUses) : null,
      durationMonths: form.durationMonths ? parseInt(form.durationMonths) : null,
      expiresAt: form.expiresAt ? new Date(form.expiresAt) : null,
      startsAt: form.startsAt ? new Date(form.startsAt) : null,
      allowedPlanIds: form.allowedPlanIds.length ? form.allowedPlanIds : undefined,
    };

    let res: any;
    if (existing) {
      res = await updateCoupon(existing.id, {
        description: payload.description,
        maxUses: payload.maxUses,
        durationMonths: payload.durationMonths,
        expiresAt: payload.expiresAt,
        startsAt: payload.startsAt,
        allowedPlanIds: form.allowedPlanIds.length ? form.allowedPlanIds : null,
      });
    } else {
      res = await createCoupon(payload);
    }

    setLoading(false);

    if (!res.ok) {
      setError(res.error || "Something went wrong.");
      return;
    }

    onSaved(res.coupon);
  };

  const previewDiscount = () => {
    if (!form.value) return null;
    const v = parseInt(form.value);
    if (isNaN(v)) return null;
    if (form.type === "PERCENT" && v > 0 && v <= 100)
      return `${v}% off`;
    if (form.type === "FIXED_CENTS" && v > 0)
      return `$${(v / 100).toFixed(2)} off`;
    return null;
  };

  const inputClass = "w-full border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2FA4A9]/30 bg-white";
  const labelClass = "block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide";

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#e5e7eb]">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-[#2FA4A9]" />
            <h2 className="text-lg font-black text-gray-900">
              {existing ? "Edit Coupon" : "Create New Coupon"}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">

          {/* Code */}
          <div>
            <label className={labelClass}>Coupon Code *</label>
            <input
              className={`${inputClass} uppercase font-mono font-bold tracking-wider`}
              value={form.code}
              onChange={(e) => set("code", e.target.value.toUpperCase().replace(/\s/g, ""))}
              placeholder="e.g. LAUNCH50"
              disabled={!!existing}
            />
            {!!existing && <p className="text-xs text-gray-400 mt-1">Code cannot be changed after creation.</p>}
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>Admin Description</label>
            <input
              className={inputClass}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Internal note (not visible to users)"
            />
          </div>

          {/* Type + Value */}
          {!existing && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Discount Type *</label>
                <select
                  className={inputClass}
                  value={form.type}
                  onChange={(e) => set("type", e.target.value as any)}
                >
                  <option value="PERCENT">Percentage (e.g. 50%)</option>
                  <option value="FIXED_CENTS">Fixed Amount (e.g. $20)</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>
                  {form.type === "PERCENT" ? "Percent (1–100) *" : "Amount in Cents *"}
                </label>
                <input
                  className={inputClass}
                  type="number"
                  min={1}
                  max={form.type === "PERCENT" ? 100 : undefined}
                  value={form.value}
                  onChange={(e) => set("value", e.target.value)}
                  placeholder={form.type === "PERCENT" ? "50" : "2000 = $20"}
                />
              </div>
            </div>
          )}

          {/* Preview */}
          {previewDiscount() && (
            <div className="bg-[#f0fafa] border border-[#2FA4A9]/20 rounded-xl px-4 py-2.5 text-sm font-bold text-[#2FA4A9]">
              Preview: {previewDiscount()}
            </div>
          )}

          {/* Max Uses */}
          <div>
            <label className={labelClass}>Max Total Uses <span className="font-normal text-gray-400">(leave empty = unlimited)</span></label>
            <input
              className={inputClass}
              type="number"
              min={1}
              value={form.maxUses}
              onChange={(e) => set("maxUses", e.target.value)}
              placeholder="e.g. 100"
            />
          </div>

          {/* Duration Months */}
          <div>
            <label className={labelClass}>Discount Duration <span className="font-normal text-gray-400">(months, leave empty = one-time only)</span></label>
            <input
              className={inputClass}
              type="number"
              min={1}
              value={form.durationMonths}
              onChange={(e) => set("durationMonths", e.target.value)}
              placeholder="e.g. 3 (discount applies for 3 renewals)"
            />
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Starts At <span className="font-normal text-gray-400">(optional)</span></label>
              <input
                className={inputClass}
                type="date"
                value={form.startsAt}
                onChange={(e) => set("startsAt", e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Expires At <span className="font-normal text-gray-400">(optional)</span></label>
              <input
                className={inputClass}
                type="date"
                value={form.expiresAt}
                onChange={(e) => set("expiresAt", e.target.value)}
              />
            </div>
          </div>

          {/* Plan Restrictions */}
          <div>
            <label className={labelClass}>Plan Restrictions <span className="font-normal text-gray-400">(none selected = all plans)</span></label>
            <div className="flex flex-wrap gap-2">
              {plans.map((plan) => {
                const selected = form.allowedPlanIds.includes(plan.id);
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => togglePlan(plan.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      selected
                        ? "bg-[#0F2A44] text-white border-[#0F2A44]"
                        : "bg-white text-gray-600 border-gray-200 hover:border-[#0F2A44]"
                    }`}
                  >
                    {plan.name} (${(plan.priceCents / 100).toFixed(0)}/mo)
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm font-bold px-4 py-3 rounded-xl">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#e5e7eb] flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 bg-[#0F2A44] hover:bg-black text-white font-bold rounded-xl text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {existing ? "Save Changes" : "Create Coupon"}
          </button>
        </div>
      </div>
    </div>
  );
}
