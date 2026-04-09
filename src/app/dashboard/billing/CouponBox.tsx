"use client";

import { useState } from "react";
import { Tag, ChevronRight, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { validateCoupon, applyCouponToSubscription } from "@/actions/coupon.actions";

interface Props {
  planId: string;
  planName: string;
  planPriceCents: number;
  onApplied: (subscriptionId?: string) => void;
}

export default function CouponBox({ planId, planName, planPriceCents, onApplied }: Props) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [preview, setPreview] = useState<{
    ok: boolean;
    error?: string;
    discountCents?: number;
    finalPriceCents?: number;
    coupon?: any;
  } | null>(null);

  const handleValidate = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setPreview(null);
    const res = await validateCoupon(code.trim(), planId);
    setPreview(res);
    setLoading(false);
  };

  const handleApply = async () => {
    if (!preview?.ok || !preview.coupon) return;
    setApplying(true);
    const res = await applyCouponToSubscription(code.trim(), planId);
    setApplying(false);
    if (res.ok) {
      onApplied(res.subscription?.id);
    } else {
      setPreview({ ok: false, error: res.error });
    }
  };

  const formatDiscount = () => {
    if (!preview?.coupon) return "";
    const c = preview.coupon;
    if (c.type === "PERCENT") return `${c.value}% off`;
    return `$${(c.value / 100).toFixed(2)} off`;
  };

  return (
    <div className="mt-4 border border-dashed border-[#2FA4A9]/40 rounded-xl p-4 bg-[#f0fafa]/50">
      <div className="flex items-center gap-2 mb-3">
        <Tag className="w-4 h-4 text-[#2FA4A9]" />
        <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Have a coupon code?</span>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setPreview(null); }}
          onKeyDown={(e) => e.key === "Enter" && handleValidate()}
          placeholder="e.g. LAUNCH50"
          className="flex-1 border border-[#e5e7eb] rounded-xl px-3 py-2 text-sm font-mono font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-[#2FA4A9]/30"
          disabled={loading || applying}
        />
        <button
          onClick={handleValidate}
          disabled={loading || applying || !code.trim()}
          className="px-4 py-2 bg-[#0F2A44] text-white rounded-xl text-xs font-bold hover:bg-black transition-colors disabled:opacity-40 flex items-center gap-1"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Apply"}
        </button>
      </div>

      {/* Error */}
      {preview && !preview.ok && (
        <div className="flex items-center gap-2 mt-2 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          {preview.error}
        </div>
      )}

      {/* Success Preview */}
      {preview?.ok && (
        <div className="mt-3 space-y-2">
          <div className="flex items-start justify-between bg-green-50 border border-green-100 rounded-xl px-4 py-3">
            <div>
              <div className="flex items-center gap-1.5 text-green-700 font-black text-sm">
                <CheckCircle className="w-4 h-4" />
                Code valid: <code className="ml-1 bg-green-100 px-1.5 py-0.5 rounded text-[11px]">{preview.coupon?.code}</code>
              </div>
              <div className="text-xs text-green-600 mt-1">
                {formatDiscount()}
                {preview.coupon?.durationMonths && (
                  <span className="ml-2 text-gray-500 font-normal">
                    · Applied for {preview.coupon.durationMonths} month{preview.coupon.durationMonths > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm line-through text-gray-400">${(planPriceCents / 100).toFixed(2)}</div>
              <div className="text-lg font-black text-green-700">${((preview.finalPriceCents ?? 0) / 100).toFixed(2)}<span className="text-xs font-normal text-gray-500">/mo</span></div>
            </div>
          </div>

          <button
            onClick={handleApply}
            disabled={applying}
            className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {applying && <Loader2 className="w-4 h-4 animate-spin" />}
            {applying ? "Activating..." : `Activate ${planName} with Discount`}
            {!applying && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      )}
    </div>
  );
}
