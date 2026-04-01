import { prisma } from "@/lib/prisma";
import InternalPricingTiers from "./InternalPricingTiers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export const metadata = {
  title: "Upgrade Plan | Dashboard",
};

export default async function DashboardUpgradePage() {
  const session = await getServerSession(authOptions);
  
  const [plans, billingModeSetting, currentSubscription] = await Promise.all([
    prisma.plan.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.platformSetting.findUnique({ where: { key: "billingMode" } }),
    prisma.subscription.findUnique({ where: { userId: (session?.user as any)?.id } })
  ]);

  const billingMode = (billingModeSetting?.value ?? "both") as "monthly" | "yearly" | "both";

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold font-serif text-[#1A1F2B]">Choose Your Growth Trajectory</h1>
        <p className="text-gray-500 text-sm mt-1">Invest in your digital infrastructure. Upgrade to lower commissions and higher visibility.</p>
      </div>

      <InternalPricingTiers 
        plans={plans} 
        billingMode={billingMode} 
        currentPlanId={currentSubscription?.planId}
        hasStripeCustomer={!!currentSubscription?.stripeCustomerId}
      />
      
    </div>
  );
}
