// ============================================================================
// app/dashboard/admin/plans/pricing/page.tsx
// Route: /dashboard/admin/plans/pricing
// Version: 1.0.0 — 2026-03-25
// Why: Admin UI to edit prices, yearly prices, commission, and billing mode.
// ============================================================================

import { getPlans } from "@/actions/plans.actions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import PlanPricingEditor from "./PlanPricingEditor";

export const metadata = { title: "Plan Pricing | Verixa Admin" };

export default async function PlanPricingPage() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") redirect("/dashboard");

  const [plans, billingModeSetting] = await Promise.all([
    getPlans(),
    prisma.platformSetting.findUnique({ where: { key: "billingMode" } }),
  ]);

  const billingMode = (billingModeSetting?.value ?? "both") as "monthly" | "yearly" | "both";

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard/admin/plans" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#0F2A44] mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Plans
          </Link>
          <h1 className="text-3xl font-serif font-black text-[#0F2A44]">Plan Pricing</h1>
          <p className="text-sm text-gray-500 mt-1">
            Edit prices and control which billing periods are shown to users. Changes apply immediately.
          </p>
        </div>

        <PlanPricingEditor plans={plans} initialBillingMode={billingMode} />
      </div>
    </div>
  );
}
