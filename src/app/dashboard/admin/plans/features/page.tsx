// ============================================================================
// app/dashboard/admin/plans/features/page.tsx
// Route: /dashboard/admin/plans/features
// Version: 1.0.0 — 2026-03-25
// Why: Admin view of all platform features. Shows which plans use each feature.
// ============================================================================

import { getFeatures, getPlans } from "@/actions/plans.actions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import FeatureLibraryClient from "./FeatureLibraryClient";

export const metadata = { title: "Feature Library | Verixa Admin" };

export default async function FeaturePage() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") redirect("/dashboard");

  const [features, plans] = await Promise.all([getFeatures(), getPlans()]);
  const categories = Array.from(new Set(features.map((f) => f.category))).sort();

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/dashboard/admin/plans" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#0F2A44] mb-2">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Plans
            </Link>
            <h1 className="text-3xl font-serif font-black text-[#0F2A44]">Feature Library</h1>
            <p className="text-sm text-gray-500 mt-1">{features.length} features across {categories.length} categories.</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/dashboard/admin/plans/builder"
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0F2A44] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#0a1e30] transition-all"
            >
              Go to Plan Builder
            </Link>
          </div>
        </div>
        <FeatureLibraryClient features={features} plans={plans} categories={categories} />
      </div>
    </div>
  );
}
