// ============================================================================
// app/dashboard/admin/plans/builder/page.tsx
// Route: /dashboard/admin/plans/builder
// Version: 1.0.0 — 2026-03-25
// Why: The heart of the config-driven platform. Admins toggle features per plan
//      in an interactive matrix. Zero deploy required.
// Env: React Server Component (renders the matrix + client for interactions)
// ============================================================================

import { getPlans, getFeatures } from "@/actions/plans.actions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PlanBuilderClient from "./PlanBuilderClient";

export const metadata = { title: "Plan Builder | Verixa Admin" };

export default async function PlanBuilderPage() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") redirect("/dashboard");

  const [plans, features] = await Promise.all([getPlans(), getFeatures()]);

  // Group features by category
  const categories = Array.from(new Set(features.map((f) => f.category))).sort();

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-8">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/dashboard/admin/plans" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#0F2A44] mb-2 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Plans
            </Link>
            <h1 className="text-3xl font-serif font-black text-[#0F2A44]">Plan Builder</h1>
            <p className="text-sm text-gray-500 mt-1">Toggle feature access per plan. Changes save instantly — no deploy needed.</p>
          </div>
        </div>

        {/* INTERACTIVE MATRIX */}
        <PlanBuilderClient plans={plans} features={features} categories={categories} />

      </div>
    </div>
  );
}
