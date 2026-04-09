"use client";

import { useState } from "react";
import { Tag, Plus, Edit2, Trash2, Users, CheckCircle, XCircle, Clock, Infinity, ChevronRight } from "lucide-react";
import { createCoupon, updateCoupon, deleteCoupon, getCouponUsages } from "@/actions/coupon.actions";
import CouponFormModal from "./CouponFormModal";

type Coupon = {
  id: string;
  code: string;
  description: string | null;
  type: string;
  value: number;
  applicableTo: string;
  allowedPlanIds: string | null;
  maxUses: number | null;
  usedCount: number;
  durationMonths: number | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  _count: { usages: number };
};

type Plan = { id: string; name: string; slug: string; priceCents: number };

export default function CouponManagerClient({
  initialCoupons,
  plans,
}: {
  initialCoupons: Coupon[];
  plans: Plan[];
}) {
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons);
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [usages, setUsages] = useState<any[]>([]);
  const [loadingUsages, setLoadingUsages] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const showStatus = (type: "success" | "error", msg: string) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus(null), 4000);
  };

  const handleToggleActive = async (coupon: Coupon) => {
    const res = await updateCoupon(coupon.id, { isActive: !coupon.isActive });
    if (res.ok) {
      setCoupons((prev) => prev.map((c) => (c.id === coupon.id ? { ...c, isActive: !c.isActive } : c)));
      showStatus("success", `Coupon ${coupon.isActive ? "deactivated" : "activated"}.`);
    } else {
      showStatus("error", res.error || "Failed.");
    }
  };

  const handleDelete = async (coupon: Coupon) => {
    if (!confirm(`Deactivate coupon "${coupon.code}"? Existing usages are preserved.`)) return;
    const res = await deleteCoupon(coupon.id);
    if (res.ok) {
      setCoupons((prev) => prev.map((c) => (c.id === coupon.id ? { ...c, isActive: false } : c)));
      showStatus("success", "Coupon deactivated.");
    } else {
      showStatus("error", "Failed to deactivate.");
    }
  };

  const handleViewUsages = async (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setLoadingUsages(true);
    const data = await getCouponUsages(coupon.id);
    setUsages(data as any[]);
    setLoadingUsages(false);
  };

  const handleSaved = (newCoupon: Coupon) => {
    if (editingCoupon) {
      setCoupons((prev) => prev.map((c) => (c.id === newCoupon.id ? { ...newCoupon, _count: c._count } : c)));
      showStatus("success", "Coupon updated.");
    } else {
      setCoupons((prev) => [{ ...newCoupon, _count: { usages: 0 } }, ...prev]);
      showStatus("success", `Coupon "${newCoupon.code}" created!`);
    }
    setEditingCoupon(null);
    setShowModal(false);
  };

  const formatDiscount = (c: Coupon) =>
    c.type === "PERCENT" ? `${c.value}%` : `$${(c.value / 100).toFixed(2)}`;

  const isExpired = (c: Coupon) => !!c.expiresAt && new Date(c.expiresAt) < new Date();
  const isNotStarted = (c: Coupon) => !!c.startsAt && new Date(c.startsAt) > new Date();

  const statusBadge = (c: Coupon) => {
    if (!c.isActive) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">INACTIVE</span>;
    if (isExpired(c)) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-500">EXPIRED</span>;
    if (isNotStarted(c)) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-50 text-yellow-600">SCHEDULED</span>;
    if (c.maxUses !== null && c.usedCount >= c.maxUses) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-500">EXHAUSTED</span>;
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-600">ACTIVE</span>;
  };

  return (
    <div className="flex gap-6 h-full">
      {/* LEFT: Coupon Table */}
      <div className="flex-1 flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 font-serif flex items-center gap-2">
              <Tag className="w-6 h-6 text-[#2FA4A9]" /> Coupon Manager
            </h1>
            <p className="text-sm text-gray-500 mt-1">Create and manage discount codes for plan subscriptions.</p>
          </div>
          <button
            onClick={() => { setEditingCoupon(null); setShowModal(true); }}
            className="flex items-center gap-2 bg-[#0F2A44] hover:bg-black text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Coupon
          </button>
        </div>

        {/* Status Flash */}
        {status && (
          <div className={`px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 ${status.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {status.type === "success" ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {status.msg}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden shadow-sm">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-gray-50 border-b border-[#e5e7eb] text-[11px] font-black text-gray-500 uppercase tracking-widest">
            <span>Code</span>
            <span>Discount</span>
            <span>Usage</span>
            <span>Expires</span>
            <span>Status</span>
            <span>Actions</span>
          </div>

          {coupons.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No coupons yet. Create your first one!</p>
            </div>
          ) : (
            coupons.map((c) => (
              <div
                key={c.id}
                className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-4 border-b border-[#f3f4f6] items-center hover:bg-gray-50/50 transition-colors ${selectedCoupon?.id === c.id ? "bg-[#f0fafa]" : ""}`}
              >
                {/* Code + description */}
                <div>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-black text-[#0F2A44] tracking-wide">{c.code}</code>
                    {c.durationMonths && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-100">
                        {c.durationMonths}mo
                      </span>
                    )}
                  </div>
                  {c.description && <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{c.description}</p>}
                </div>

                {/* Discount value */}
                <div className="font-black text-[#2FA4A9] text-sm">{formatDiscount(c)}</div>

                {/* Usage */}
                <div className="text-sm font-medium text-gray-700">
                  {c._count.usages}
                  {c.maxUses !== null ? ` / ${c.maxUses}` : <span className="text-gray-400 ml-0.5 text-xs">/ ∞</span>}
                </div>

                {/* Expiry */}
                <div className="text-xs text-gray-500">
                  {c.expiresAt
                    ? new Date(c.expiresAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })
                    : <span className="flex items-center gap-1 text-gray-400"><Infinity className="w-3 h-3" /> Never</span>}
                </div>

                {/* Status */}
                <div>{statusBadge(c)}</div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleViewUsages(c)}
                    title="View Usage"
                    className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors"
                  >
                    <Users className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { setEditingCoupon(c); setShowModal(true); }}
                    title="Edit"
                    className="p-1.5 rounded-lg hover:bg-yellow-50 text-gray-500 hover:text-yellow-600 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggleActive(c)}
                    title={c.isActive ? "Deactivate" : "Activate"}
                    className={`p-1.5 rounded-lg transition-colors ${c.isActive ? "hover:bg-red-50 text-gray-500 hover:text-red-600" : "hover:bg-green-50 text-gray-500 hover:text-green-600"}`}
                  >
                    {c.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT: Usage Detail Panel */}
      {selectedCoupon && (
        <div className="w-80 flex-shrink-0 bg-white border border-[#e5e7eb] rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 bg-gray-50 border-b border-[#e5e7eb] flex items-center justify-between">
            <div>
              <code className="text-sm font-black text-[#0F2A44]">{selectedCoupon.code}</code>
              <p className="text-xs text-gray-500 mt-0.5">Usage History ({usages.length})</p>
            </div>
            <button onClick={() => setSelectedCoupon(null)} className="text-gray-400 hover:text-gray-600">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loadingUsages ? (
              <div className="flex items-center justify-center py-8 text-gray-400 text-sm">Loading...</div>
            ) : usages.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">No usages yet.</div>
            ) : (
              usages.map((u) => (
                <div key={u.id} className="bg-gray-50 rounded-xl p-3 text-xs space-y-1 border border-[#f0f0f0]">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-700 truncate">{u.subscription?.plan?.name ?? "—"}</span>
                    <span className="text-green-600 font-black">-${(u.discountCents / 100).toFixed(2)}</span>
                  </div>
                  <div className="text-gray-500">{new Date(u.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <CouponFormModal
          plans={plans}
          existing={editingCoupon}
          onClose={() => { setShowModal(false); setEditingCoupon(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
