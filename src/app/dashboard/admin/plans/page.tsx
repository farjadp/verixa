// ============================================================================
// Hardware Source: src/app/dashboard/admin/plans/page.tsx
// Route: /dashboard/admin/plans
// Version: 1.0.0 — 2026-04-08
// Why: High-privilege admin route for platform governance, operations, and configuration workflows.
// Domain: Admin Operations
// Env / Identity: React Server Component
// Owner: Verixa Web
// Notes: Must remain server-auth gated for ADMIN users; avoid exposing privileged operations to client without checks.
// Critical Path: Privileged management surface affecting platform-wide data, policy, and operational behavior.
// Security Notes: Enforce ADMIN authorization server-side before reads/writes and before rendering sensitive payloads.
// Risk Notes: Regressions here can impact many users; prefer explicit guards and resilient fallbacks for DB calls.
// ============================================================================
import { getPlans } from "@/actions/plans.actions";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { Users, Zap, Grid3X3, Library, TrendingDown, DollarSign } from "lucide-react";

export const metadata = { title: "Plan Management | Verixa Admin" };

const PLAN_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  free:    { bg: "bg-gray-50",         border: "border-gray-200",   text: "text-gray-700",   badge: "bg-gray-100 text-gray-600"     },
  starter: { bg: "bg-blue-50",         border: "border-blue-200",   text: "text-blue-700",   badge: "bg-blue-100 text-blue-700"     },
  growth:  { bg: "bg-teal-50",         border: "border-teal-200",   text: "text-teal-700",   badge: "bg-teal-100 text-teal-700"     },
  pro:     { bg: "bg-[#0F2A44]/5",     border: "border-[#0F2A44]/20", text: "text-[#0F2A44]", badge: "bg-[#0F2A44] text-white"      },
};

export default async function PlansPage() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") redirect("/dashboard");

  const plans = await getPlans();

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-8">
      <div className="max-w-6xl mx-auto">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-serif font-black text-[#0F2A44]">Plan Management</h1>
            <p className="text-sm text-gray-500 mt-1">Configure pricing, commission, and feature access. No deploy needed.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard/admin/plans/pricing" className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:border-[#2FA4A9] transition-colors shadow-sm">
              <DollarSign className="w-4 h-4" /> Pricing
            </Link>
            <Link href="/dashboard/admin/plans/features" className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:border-[#2FA4A9] transition-colors shadow-sm">
              <Library className="w-4 h-4" /> Feature Library
            </Link>
            <Link href="/dashboard/admin/plans/builder" className="flex items-center gap-2 px-4 py-2.5 bg-[#0F2A44] text-white rounded-xl text-sm font-bold hover:bg-black transition-colors shadow-md">
              <Grid3X3 className="w-4 h-4" /> Plan Builder
            </Link>
          </div>
        </div>

        {/* PLAN CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {plans.map((plan) => {
            const c = PLAN_COLORS[plan.slug] ?? PLAN_COLORS.free;
            const subscribers = plan._count.subscriptions;

            return (
              <div key={plan.id} className={`relative bg-white border ${c.border} rounded-3xl p-6 shadow-sm hover:shadow-md transition-all`}>
                {plan.isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#2FA4A9] text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-md">
                    Recommended
                  </div>
                )}

                <div className="flex items-center justify-between mb-4">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${c.badge}`}>
                    {plan.name}
                  </span>
                  {!plan.isActive && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-md">Inactive</span>
                  )}
                </div>

                <div className="mb-4">
                  <div className="text-3xl font-black text-[#0F2A44]">
                    {plan.priceCents === 0 ? "Free" : `$${(plan.priceCents / 100).toFixed(0)}`}
                    {plan.priceCents > 0 && <span className="text-sm font-normal text-gray-400">/mo</span>}
                  </div>
                  {plan.description && (
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{plan.description}</p>
                  )}
                </div>

                <div className="space-y-2 py-4 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-gray-500"><TrendingDown className="w-3.5 h-3.5" /> Commission</span>
                    <span className="font-bold text-[#0F2A44]">{plan.commission}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-gray-500"><Users className="w-3.5 h-3.5" /> Subscribers</span>
                    <span className="font-bold text-[#0F2A44]">{subscribers}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-gray-500"><Zap className="w-3.5 h-3.5" /> Features</span>
                    <span className="font-bold text-[#0F2A44]">{plan.planFeatures.filter(pf => pf.enabled).length}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex gap-2">
                  <Link href={`/dashboard/admin/plans/builder`} className="flex-1 text-center text-xs font-bold text-[#2FA4A9] hover:bg-[#E5F5F5] py-2 rounded-lg transition-colors">
                    Configure
                  </Link>
                  <Link href={`/dashboard/admin/plans/users?plan=${plan.slug}`} className="flex-1 text-center text-xs font-bold text-gray-500 hover:bg-gray-50 py-2 rounded-lg transition-colors">
                    Users →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* QUICK LINKS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { href: "/dashboard/admin/plans/builder", icon: Grid3X3, title: "Plan Builder", desc: "Toggle features per plan in an interactive matrix. Changes apply instantly." },
            { href: "/dashboard/admin/plans/features", icon: Library, title: "Feature Library", desc: "Add, edit, or remove platform features. Organized by category." },
            { href: "/dashboard/admin/plans/users", icon: Users, title: "User Plan Management", desc: "Assign, upgrade, or cancel subscriptions for any consultant." },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-[#2FA4A9] hover:shadow-md transition-all group">
              <item.icon className="w-6 h-6 text-[#2FA4A9] mb-3" />
              <h3 className="font-bold text-[#0F2A44] mb-1">{item.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
              <span className="mt-4 inline-block text-xs font-bold text-[#2FA4A9] group-hover:translate-x-1 transition-transform">Open →</span>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}
