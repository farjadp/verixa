import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { getPlatformAnalytics } from "@/lib/analytics";
import { prisma } from "@/lib/prisma";
import AdminAnalyticsClient from "./AdminAnalyticsClient";

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await getServerSession(authOptions);

  // 🔒 ADMIN ONLY — hard redirect if not admin
  if (!session || (session.user as any).role !== "ADMIN") {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const days = sp.period === "7" ? 7 : sp.period === "90" ? 90 : 30;

  // Platform-wide analytics (only admin can call this)
  const platform = await getPlatformAnalytics(days);

  // Top consultants by bookings (admin-only view)
  const topConsultants = await prisma.consultantProfile.findMany({
    include: {
      bookings: { select: { grossAmountCents: true, paymentStatus: true, status: true } },
      reviews: { select: { rating: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Build enriched consultant rows
  const consultantRows = topConsultants.map((c) => {
    const totalBookings = c.bookings.length;
    const completedBookings = c.bookings.filter(b => b.paymentStatus === "CAPTURED").length;
    const revenueCents = c.bookings
      .filter(b => b.paymentStatus === "CAPTURED")
      .reduce((s, b) => s + b.grossAmountCents, 0);
    const avgRating = c.reviews.length > 0
      ? Math.round(c.reviews.reduce((s, r) => s + r.rating, 0) / c.reviews.length * 10) / 10
      : 0;
    return {
      id: c.id,
      fullName: c.fullName,
      province: c.province,
      totalBookings,
      completedBookings,
      revenueCents,
      avgRating,
      reviewCount: c.reviews.length,
      isClaimed: !!c.userId,
    };
  }).sort((a, b) => b.revenueCents - a.revenueCents);

  return (
    <AdminAnalyticsClient
      platform={platform}
      consultantRows={consultantRows}
      days={days}
    />
  );
}
