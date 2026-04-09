// ============================================================================
// Hardware Source: src/app/dashboard/analytics/page.tsx
// Route: /dashboard/analytics
// Version: 1.0.0 — 2026-04-08
// Why: Authenticated consultant/dashboard route for profile management, booking operations, and workspace workflows.
// Domain: Authenticated Dashboard
// Env / Identity: React Server Component
// Owner: Verixa Web
// Notes: Assumes authenticated session context; unauthorized users must be redirected before data access.
// ============================================================================
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getConsultantAnalytics, getCompetitorInsight } from "@/lib/analytics";
import AnalyticsDashboardClient from "./AnalyticsDashboardClient";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const profile = await prisma.consultantProfile.findUnique({
    where: { userId: (session.user as any).id },
    select: { id: true, fullName: true },
  });

  if (!profile) redirect("/dashboard");

  const sp = await searchParams;
  const days = sp.period === "7" ? 7 : sp.period === "90" ? 90 : 30;

  const [analytics, competitor] = await Promise.all([
    getConsultantAnalytics(profile.id, days),
    getCompetitorInsight(profile.id, days),
  ]);

  return (
    <AnalyticsDashboardClient
      analytics={analytics}
      competitor={competitor}
      consultantName={profile.fullName}
      days={days}
    />
  );
}
