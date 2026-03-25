// ============================================================================
// app/dashboard/admin/plans/users/page.tsx
// Route: /dashboard/admin/plans/users
// Version: 1.0.0 — 2026-03-25
// Why: Admin CRM for subscriptions. See who's on what plan, assign/cancel plans.
// ============================================================================

import { getSubscriptions, getPlans, getUnsubscribedConsultants } from "@/actions/plans.actions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import UserPlansClient from "./UserPlansClient";

export const metadata = { title: "User Plan Management | Verixa Admin" };

export default async function UserPlansPage() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") redirect("/dashboard");

  const [subscriptions, plans, unsubscribed] = await Promise.all([
    getSubscriptions(),
    getPlans(),
    getUnsubscribedConsultants(),
  ]);

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/dashboard/admin/plans" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#0F2A44] mb-2">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Plans
            </Link>
            <h1 className="text-3xl font-serif font-black text-[#0F2A44]">User Plan Management</h1>
            <p className="text-sm text-gray-500 mt-1">
              {subscriptions.length} active subscriptions · {unsubscribed.length} consultants on Free (implicit)
            </p>
          </div>
        </div>
        <UserPlansClient subscriptions={subscriptions} plans={plans} unsubscribed={unsubscribed} />
      </div>
    </div>
  );
}
