"use client";
// ============================================================================
// UserPlansClient.tsx
// Version: 1.0.0 — 2026-03-25
// Why: Full user-plan CRM: table with plan badges, assign/cancel actions, and
//      a free users panel to quickly upgrade consultants.
// ============================================================================

import { useState, useTransition } from "react";
import { assignPlan, cancelSubscription } from "@/actions/plans.actions";
import { ChevronDown, Loader2, UserCheck, UserX, Crown } from "lucide-react";
import { useRouter } from "next/navigation";

const PLAN_COLORS: Record<string, string> = {
  free:    "bg-gray-100 text-gray-700",
  starter: "bg-blue-100 text-blue-800",
  growth:  "bg-teal-100 text-teal-800",
  pro:     "bg-[#0F2A44] text-white",
};

const STATUS_COLORS: Record<string, string> = {
  active:    "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  expired:   "bg-yellow-100 text-yellow-700",
};

type Subscription = {
  id: string;
  userId: string;
  status: string;
  startDate: Date;
  endDate: Date | null;
  notes: string | null;
  user: {
    id: string; name: string | null; email: string | null; role: string; image: string | null;
    consultantProfile: { fullName: string; licenseNumber: string } | null;
  };
  plan: { id: string; name: string; slug: string; commission: number; priceCents: number };
};
type Plan = { id: string; name: string; slug: string; commission: number; priceCents: number };
type UnsubscribedConsultant = {
  id: string; name: string | null; email: string | null;
  consultantProfile: { fullName: string; licenseNumber: string } | null;
};

interface Props {
  subscriptions: Subscription[];
  plans: Plan[];
  unsubscribed: UnsubscribedConsultant[];
}

export default function UserPlansClient({ subscriptions, plans, unsubscribed }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [assignTo, setAssignTo] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const handleAssign = (userId: string) => {
    if (!selectedPlan) return;
    setLoadingId(userId);
    startTransition(async () => {
      await assignPlan(userId, selectedPlan, notes || undefined);
      setAssignTo(null);
      setSelectedPlan("");
      setNotes("");
      setLoadingId(null);
      router.refresh();
    });
  };

  const handleCancel = (userId: string) => {
    if (!confirm("This will downgrade the user to Free. Continue?")) return;
    setLoadingId(userId);
    startTransition(async () => {
      await cancelSubscription(userId);
      setLoadingId(null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {/* ACTIVE SUBSCRIPTIONS TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-[#0F2A44]">Active Subscriptions</h2>
          <p className="text-xs text-gray-400 mt-0.5">{subscriptions.length} subscribers with explicit plan assignments</p>
        </div>

        {subscriptions.length === 0 ? (
          <div className="p-12 text-center">
            <Crown className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 font-medium">No subscriptions yet.</p>
            <p className="text-xs text-gray-300 mt-1">Assign a plan to a consultant below.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="text-left p-4 text-xs font-black uppercase tracking-widest text-gray-400">User</th>
                  <th className="text-left p-4 text-xs font-black uppercase tracking-widest text-gray-400">Plan</th>
                  <th className="text-left p-4 text-xs font-black uppercase tracking-widest text-gray-400">Status</th>
                  <th className="text-left p-4 text-xs font-black uppercase tracking-widest text-gray-400">Commission</th>
                  <th className="text-left p-4 text-xs font-black uppercase tracking-widest text-gray-400">Since</th>
                  <th className="text-right p-4 text-xs font-black uppercase tracking-widest text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                          {(sub.user.consultantProfile?.fullName ?? sub.user.name ?? "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-[#1A1F2B]">
                            {sub.user.consultantProfile?.fullName ?? sub.user.name ?? "Unknown"}
                          </div>
                          <div className="text-xs text-gray-400">{sub.user.email}</div>
                          {sub.user.consultantProfile?.licenseNumber && (
                            <div className="text-[10px] text-gray-300">#{sub.user.consultantProfile.licenseNumber}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wide ${PLAN_COLORS[sub.plan.slug] ?? "bg-gray-100 text-gray-700"}`}>
                        {sub.plan.name}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${STATUS_COLORS[sub.status] ?? "bg-gray-50 text-gray-400"}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-sm text-[#0F2A44]">{sub.plan.commission}%</td>
                    <td className="p-4 text-xs text-gray-400">
                      {new Date(sub.startDate).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        {/* Reassign dropdown */}
                        {assignTo === sub.userId ? (
                          <div className="flex items-center gap-2">
                            <select value={selectedPlan} onChange={(e) => setSelectedPlan(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:border-[#2FA4A9] focus:outline-none">
                              <option value="">Select plan…</option>
                              {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <button onClick={() => handleAssign(sub.userId)} disabled={!selectedPlan || loadingId === sub.userId} className="px-3 py-1.5 bg-[#0F2A44] text-white text-xs font-bold rounded-lg hover:bg-black disabled:opacity-40 flex items-center gap-1">
                              {loadingId === sub.userId ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}
                              Apply
                            </button>
                            <button onClick={() => setAssignTo(null)} className="px-2 py-1.5 border border-gray-200 text-xs text-gray-500 rounded-lg hover:bg-gray-50">✕</button>
                          </div>
                        ) : (
                          <>
                            <button onClick={() => { setAssignTo(sub.userId); setSelectedPlan(sub.plan.id); }} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:border-[#2FA4A9] hover:text-[#2FA4A9] transition-colors">
                              Change Plan
                            </button>
                            {sub.status === "active" && (
                              <button onClick={() => handleCancel(sub.userId)} disabled={loadingId === sub.userId} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                                {loadingId === sub.userId ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FREE / UNSUBSCRIBED CONSULTANTS */}
      {unsubscribed.length > 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-[#0F2A44]">Free Tier Consultants</h2>
            <p className="text-xs text-gray-400 mt-0.5">{unsubscribed.length} consultants on the implicit Free plan</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="text-left p-4 text-xs font-black uppercase tracking-widest text-gray-400">Consultant</th>
                  <th className="text-left p-4 text-xs font-black uppercase tracking-widest text-gray-400">Current Plan</th>
                  <th className="text-right p-4 text-xs font-black uppercase tracking-widest text-gray-400">Assign Plan</th>
                </tr>
              </thead>
              <tbody>
                {unsubscribed.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="p-4">
                      <div className="font-semibold text-sm text-[#1A1F2B]">
                        {u.consultantProfile?.fullName ?? u.name ?? "Unknown"}
                      </div>
                      <div className="text-xs text-gray-400">{u.email}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-black uppercase bg-gray-100 text-gray-600">
                        Free
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        {assignTo === u.id ? (
                          <div className="flex items-center gap-2">
                            <select value={selectedPlan} onChange={(e) => setSelectedPlan(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:border-[#2FA4A9] focus:outline-none">
                              <option value="">Select plan…</option>
                              {plans.filter((p) => p.slug !== "free").map((p) => (
                                <option key={p.id} value={p.id}>{p.name} — ${(p.priceCents / 100).toFixed(0)}/mo ({p.commission}% commission)</option>
                              ))}
                            </select>
                            <button onClick={() => handleAssign(u.id)} disabled={!selectedPlan || loadingId === u.id} className="px-3 py-1.5 bg-[#2FA4A9] text-white text-xs font-bold rounded-lg hover:bg-[#1d8285] disabled:opacity-40 flex items-center gap-1">
                              {loadingId === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}
                              Assign
                            </button>
                            <button onClick={() => setAssignTo(null)} className="px-2 py-1.5 border border-gray-200 text-xs text-gray-500 rounded-lg hover:bg-gray-50">✕</button>
                          </div>
                        ) : (
                          <button onClick={() => { setAssignTo(u.id); setSelectedPlan(""); }} className="px-3 py-1.5 bg-[#0F2A44] text-white rounded-lg text-xs font-bold hover:bg-black transition-colors flex items-center gap-1">
                            <Crown className="w-3 h-3" /> Upgrade
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
