import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAllCoupons } from "@/actions/coupon.actions";
import { getPlans } from "@/actions/plans.actions";
import CouponManagerClient from "./CouponManagerClient";
import { Tag } from "lucide-react";

export default async function CouponsPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") redirect("/dashboard");

  const [coupons, plans] = await Promise.all([
    getAllCoupons(),
    getPlans(),
  ]);

  const simplePlans = plans.map((p: { id: string; name: string; slug: string; priceCents: number }) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    priceCents: p.priceCents,
  }));

  return (
    <div className="p-6 md:p-10 max-w-[1400px] mx-auto min-h-screen">
      <CouponManagerClient
        initialCoupons={coupons as any}
        plans={simplePlans}
      />
    </div>
  );
}
