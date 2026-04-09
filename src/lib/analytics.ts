/**
 * Analytics Processing Layer
 * All server-side data fetching for the analytics dashboards.
 * Queries are aggregate-only — no personal info exposed (PIPEDA compliant).
 */

import { prisma } from "@/lib/prisma";
import { subDays, startOfDay, format } from "date-fns";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ConsultantAnalytics {
  // Overview KPIs
  profileViews: number;
  profileClicks: number;
  bookingStarts: number;
  bookingsCompleted: number;
  revenueCents: number;
  conversionRate: number; // bookingsCompleted / profileViews (%)

  // Funnel stages for chart
  funnel: { stage: string; count: number }[];

  // Booking quality (from Booking model)
  totalBookings: number;
  acceptanceRate: number;     // CONFIRMED / (CONFIRMED + DECLINED) %
  cancellationRate: number;   // CANCELLED / total %
  noShowRate: number;         // NO_SHOW / total %
  avgBookingValueCents: number;

  // Reviews
  totalReviews: number;
  avgRating: number;

  // Visibility
  visibilityScore: number;    // computed formula
  searchImpressions: number;
  trend: "up" | "down" | "flat";

  // Traffic sources (PIPEDA: aggregate counts only)
  trafficSources: { source: string; count: number; pct: number }[];

  // 30-day sparkline (views per day)
  dailyViews: { date: string; views: number }[];

  // High-intent abandons (reached booking_started but NOT booking_completed)
  highIntentAbandons: number;

  // Action suggestions
  suggestions: ActionSuggestion[];
}

export interface CompetitorInsight {
  yourViews: number;
  avgViews: number;
  yourBookings: number;
  avgBookings: number;
  yourRating: number;
  avgRating: number;
  yourVisibilityScore: number;
  avgVisibilityScore: number;
  specialization: string | null;
  totalPeers: number;
}

export interface PlatformAnalytics {
  totalUsers: number;
  totalConsultants: number;
  activeConsultants: number;
  totalBookings: number;
  totalRevenueCents: number;
  conversionRate: number;
  churnRate: number;
  topArticles: { id: string; title: string; views: number }[];
  highIntentAbandons: number;
  demandByProvince: { province: string; count: number }[];
  revenueBySource: { source: string; revenueCents: number }[];
  dailyBookings: { date: string; count: number }[];
}

export interface ActionSuggestion {
  icon: string;
  message: string;
  cta: string;
  ctaHref: string;
  impact: "high" | "medium" | "low";
}

// ─────────────────────────────────────────────────────────────────────────────
// Consultant Analytics
// ─────────────────────────────────────────────────────────────────────────────

export async function getConsultantAnalytics(
  profileId: string,
  days: number = 30
): Promise<ConsultantAnalytics> {
  const since = startOfDay(subDays(new Date(), days));

  // Parallel fetch everything
  const [
    eventRows,
    allBookings,
    allReviews,
    recentBookings,
  ] = await Promise.all([
    // All analytics events for this consultant in the period
    prisma.analyticsEvent.findMany({
      where: { consultantId: profileId, createdAt: { gte: since } },
      select: { eventName: true, source: true, utmSource: true, createdAt: true, sessionId: true },
    }),
    // ALL-TIME bookings for rates
    prisma.booking.findMany({
      where: { consultantProfileId: profileId },
      select: { status: true, grossAmountCents: true, paymentStatus: true, createdAt: true },
    }),
    // ALL-TIME reviews
    prisma.review.findMany({
      where: { consultantProfileId: profileId },
      select: { rating: true },
    }),
    // Period bookings for revenue
    prisma.booking.findMany({
      where: { consultantProfileId: profileId, createdAt: { gte: since } },
      select: { status: true, grossAmountCents: true, netAmountCents: true, paymentStatus: true },
    }),
  ]);

  // KPI counts from events
  const profileViews   = eventRows.filter(e => e.eventName === "profile_view").length;
  const profileClicks  = eventRows.filter(e => e.eventName === "profile_clicked").length;
  const bookingStarts  = eventRows.filter(e => e.eventName === "booking_flow_started").length;
  const bookingsCompleted = eventRows.filter(e => e.eventName === "booking_completed").length;

  // Revenue from captured bookings in period
  const revenueCents = recentBookings
    .filter(b => b.paymentStatus === "CAPTURED")
    .reduce((sum, b) => sum + (b.grossAmountCents ?? 0), 0);

  const conversionRate = profileViews > 0
    ? Math.round((bookingsCompleted / profileViews) * 1000) / 10
    : 0;

  // Funnel array (for chart)
  const funnel = [
    { stage: "Profile Views", count: profileViews },
    { stage: "Clicks",        count: profileClicks },
    { stage: "Booking Starts",count: bookingStarts },
    { stage: "Completed",     count: bookingsCompleted },
  ];

  // Booking quality metrics (all-time)
  const totalBookings = allBookings.length;
  const confirmed   = allBookings.filter(b => b.status === "CONFIRMED" || b.status === "COMPLETED").length;
  const declined    = allBookings.filter(b => b.status === "DECLINED").length;
  const cancelled   = allBookings.filter(b => b.status === "CANCELLED").length;
  const noShow      = allBookings.filter(b => b.status === "NO_SHOW").length;
  const completed   = allBookings.filter(b => b.status === "COMPLETED").length;

  const acceptanceRate   = (confirmed + declined) > 0 ? Math.round(confirmed / (confirmed + declined) * 100) : 0;
  const cancellationRate = totalBookings > 0 ? Math.round(cancelled / totalBookings * 100) : 0;
  const noShowRate       = totalBookings > 0 ? Math.round(noShow / totalBookings * 100) : 0;

  const completedBookings = allBookings.filter(b => b.status === "COMPLETED" || b.paymentStatus === "CAPTURED");
  const avgBookingValueCents = completedBookings.length > 0
    ? Math.round(completedBookings.reduce((s, b) => s + (b.grossAmountCents ?? 0), 0) / completedBookings.length)
    : 0;

  // Reviews
  const totalReviews = allReviews.length;
  const avgRating = totalReviews > 0
    ? Math.round(allReviews.reduce((s, r) => s + r.rating, 0) / totalReviews * 10) / 10
    : 0;

  // Visibility Score: views×1 + completed bookings×10 + reviews×5
  const visibilityScore = profileViews * 1 + completed * 10 + totalReviews * 5;

  // Search impressions = profile_view events specifically
  const searchImpressions = eventRows.filter(e =>
    e.eventName === "search_impression" || e.eventName === "profile_view"
  ).length;

  // Trend: compare first half vs second half of period
  const midpoint = startOfDay(subDays(new Date(), Math.floor(days / 2)));
  const firstHalf  = eventRows.filter(e => e.eventName === "profile_view" && new Date(e.createdAt) < midpoint).length;
  const secondHalf = eventRows.filter(e => e.eventName === "profile_view" && new Date(e.createdAt) >= midpoint).length;
  const trend: "up" | "down" | "flat" =
    secondHalf > firstHalf ? "up" :
    secondHalf < firstHalf ? "down" : "flat";

  // Traffic sources
  const sourceMap: Record<string, number> = {};
  for (const e of eventRows) {
    if (e.eventName !== "profile_view") continue;
    const src = e.utmSource || e.source || "direct";
    const normalized = normalizeSource(src);
    sourceMap[normalized] = (sourceMap[normalized] ?? 0) + 1;
  }
  const totalSourceEvents = Object.values(sourceMap).reduce((a, b) => a + b, 0);
  const trafficSources = Object.entries(sourceMap)
    .map(([source, count]) => ({
      source,
      count,
      pct: totalSourceEvents > 0 ? Math.round(count / totalSourceEvents * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Daily views sparkline (last `days` days)
  const dailyMap: Record<string, number> = {};
  for (const e of eventRows) {
    if (e.eventName !== "profile_view") continue;
    const key = format(new Date(e.createdAt), "yyyy-MM-dd");
    dailyMap[key] = (dailyMap[key] ?? 0) + 1;
  }
  const dailyViews = Array.from({ length: days }, (_, i) => {
    const date = format(subDays(new Date(), days - 1 - i), "yyyy-MM-dd");
    return { date, views: dailyMap[date] ?? 0 };
  });

  // High-intent abandons - unique sessions that started but didn't pay/complete
  const abandons = eventRows
    .filter(e => e.eventName === "booking_flow_started" && e.sessionId)
    .map(e => e.sessionId!)
    .filter(sid => !eventRows.some(e => e.sessionId === sid && (e.eventName === "payment_authorized" || e.eventName === "booking_completed")));
  const highIntentAbandons = new Set(abandons).size;

  // Action suggestions
  const suggestions = buildActionSuggestions({
    profileViews,
    totalReviews,
    avgRating,
    conversionRate,
    totalBookings,
    acceptanceRate,
    visibilityScore,
  });

  return {
    profileViews,
    profileClicks,
    bookingStarts,
    bookingsCompleted,
    revenueCents,
    conversionRate,
    funnel,
    totalBookings,
    acceptanceRate,
    cancellationRate,
    noShowRate,
    avgBookingValueCents,
    totalReviews,
    avgRating,
    visibilityScore,
    searchImpressions,
    trend,
    trafficSources,
    dailyViews,
    highIntentAbandons,
    suggestions,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Competitor Insight (by specialization — PIPEDA: aggregate only)
// ─────────────────────────────────────────────────────────────────────────────

export async function getCompetitorInsight(
  profileId: string,
  days: number = 30
): Promise<CompetitorInsight> {
  const since = startOfDay(subDays(new Date(), days));

  // Get the consultant's specialization from their ConsultationType titles
  const profile = await prisma.consultantProfile.findUnique({
    where: { id: profileId },
    include: { consultationTypes: { select: { title: true }, take: 1 } },
  });
  const specialization = profile?.consultationTypes?.[0]?.title ?? null;
  const province = profile?.province ?? null;

  // Get peer consultant IDs (Cascading logic: Specialization+Province -> Specialization -> Province)
  let peerIds: string[] = [];
  
  // 1. Exact Match: Specialization + Province
  if (specialization && province) {
    const peers1 = await prisma.consultantProfile.findMany({
      where: {
        province,
        consultationTypes: { some: { title: { contains: specialization.split(" ")[0] } } },
        id: { not: profileId },
      },
      select: { id: true },
      take: 200,
    });
    peerIds = peers1.map(p => p.id);
  }

  // 2. Fallback 1: Specialization only
  if (peerIds.length === 0 && specialization) {
    const peers2 = await prisma.consultantProfile.findMany({
      where: {
        consultationTypes: { some: { title: { contains: specialization.split(" ")[0] } } },
        id: { not: profileId },
      },
      select: { id: true },
      take: 200,
    });
    peerIds = peers2.map(p => p.id);
  }

  // 3. Fallback 2: Province only
  if (peerIds.length === 0 && province) {
    const peers3 = await prisma.consultantProfile.findMany({
      where: {
        province,
        id: { not: profileId },
      },
      select: { id: true },
      take: 200,
    });
    peerIds = peers3.map(p => p.id);
  }

  // Get own metrics
  const [myEvents, myBookings, myReviews] = await Promise.all([
    prisma.analyticsEvent.count({ where: { consultantId: profileId, eventName: "profile_view", createdAt: { gte: since } } }),
    prisma.booking.count({ where: { consultantProfileId: profileId, status: { in: ["COMPLETED", "CONFIRMED"] } } }),
    prisma.review.aggregate({ where: { consultantProfileId: profileId }, _avg: { rating: true }, _count: { id: true } }),
  ]);

  const totalPeers = peerIds.length;

  if (totalPeers === 0) {
    const yourVisScore = myEvents * 1 + myBookings * 10 + (myReviews._count.id ?? 0) * 5;
    return {
      yourViews: myEvents,
      avgViews: myEvents,
      yourBookings: myBookings,
      avgBookings: myBookings,
      yourRating: myReviews._avg.rating ?? 0,
      avgRating: myReviews._avg.rating ?? 0,
      yourVisibilityScore: yourVisScore,
      avgVisibilityScore: yourVisScore,
      specialization,
      totalPeers: 0,
    };
  }

  // Aggregate peer metrics
  const [peerViews, peerBookings, peerReviews] = await Promise.all([
    prisma.analyticsEvent.groupBy({
      by: ["consultantId"],
      where: { consultantId: { in: peerIds }, eventName: "profile_view", createdAt: { gte: since } },
      _count: { id: true },
    }),
    prisma.booking.groupBy({
      by: ["consultantProfileId"],
      where: { consultantProfileId: { in: peerIds }, status: { in: ["COMPLETED", "CONFIRMED"] } },
      _count: { id: true },
    }),
    prisma.review.groupBy({
      by: ["consultantProfileId"],
      where: { consultantProfileId: { in: peerIds } },
      _avg: { rating: true },
    }),
  ]);

  const avgViews    = peerViews.length > 0 ? Math.round(peerViews.reduce((s, r) => s + (r._count.id ?? 0), 0) / peerViews.length) : 0;
  const avgBookings = peerBookings.length > 0 ? Math.round(peerBookings.reduce((s, r) => s + (r._count.id ?? 0), 0) / peerBookings.length) : 0;
  const avgRating   = peerReviews.length > 0
    ? Math.round(peerReviews.reduce((s, r) => s + (r._avg.rating ?? 0), 0) / peerReviews.length * 10) / 10
    : 0;

  const yourVisScore = myEvents * 1     + myBookings * 10     + (myReviews._count.id ?? 0) * 5;
  const avgVisScore  = avgViews  * 1    + avgBookings  * 10   + (peerReviews.length > 0 ? 3 * 5 : 0);

  return {
    yourViews:          myEvents,
    avgViews,
    yourBookings:       myBookings,
    avgBookings,
    yourRating:         Math.round((myReviews._avg.rating ?? 0) * 10) / 10,
    avgRating,
    yourVisibilityScore: yourVisScore,
    avgVisibilityScore:  avgVisScore,
    specialization,
    totalPeers,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Platform Analytics (Admin)
// ─────────────────────────────────────────────────────────────────────────────

export async function getPlatformAnalytics(days: number = 30): Promise<PlatformAnalytics> {
  const since = startOfDay(subDays(new Date(), days));

  const [
    totalUsers,
    totalConsultants,
    activeConsultants,
    totalBookings,
    revenueData,
    articleEventRows,
    demandRows,
    highIntentStarts,
    highIntentCompleted,
    dailyBookingRows,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "CLIENT" } }),
    prisma.consultantProfile.count(),
    prisma.booking.groupBy({ by: ["consultantProfileId"], where: { createdAt: { gte: since } }, _count: { id: true } })
      .then(r => r.length),
    prisma.booking.count(),
    prisma.booking.aggregate({
      where: { paymentStatus: "CAPTURED" },
      _sum: { grossAmountCents: true },
    }),
    // Article views
    prisma.analyticsEvent.groupBy({
      by: ["articleId"],
      where: { eventName: "article_view", articleId: { not: null }, createdAt: { gte: since } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    }),
    // Demand by province (from search events)
    prisma.analyticsEvent.groupBy({
      by: ["province"],
      where: { eventName: "search_performed", province: { not: null }, createdAt: { gte: since } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    }),
    // High-intent: booking_flow_started (to grab sessions)
    prisma.analyticsEvent.findMany({ where: { eventName: "booking_flow_started", createdAt: { gte: since } }, select: { sessionId: true } }),
    // High-intent completes: payment_authorized or booking_completed
    prisma.analyticsEvent.findMany({ where: { eventName: { in: ["payment_authorized", "booking_completed"] }, createdAt: { gte: since } }, select: { sessionId: true } }),
    // Daily bookings for chart
    prisma.booking.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    }),
  ]);

  const totalRevenueCents = revenueData._sum.grossAmountCents ?? 0;

  const validStarts = highIntentStarts.length;
  const uniqueStarts = new Set(highIntentStarts.map((e: any) => e.sessionId).filter(Boolean));
  const uniqueCompletes = new Set(highIntentCompleted.map((e: any) => e.sessionId).filter(Boolean));

  let abandons = 0;
  uniqueStarts.forEach(sid => { if (!uniqueCompletes.has(sid)) abandons++; });

  // Conversion rate: completed sessions / started sessions
  const conversionRate = uniqueStarts.size > 0
    ? Math.round((uniqueCompletes.size / uniqueStarts.size) * 1000) / 10
    : 0;

  // Churn: consultants with 0 bookings in last 30 days vs total
  const inactiveConsultants = totalConsultants - activeConsultants;
  const churnRate = totalConsultants > 0
    ? Math.round(inactiveConsultants / totalConsultants * 100)
    : 0;

  // Article titles lookup
  const articleIds = articleEventRows.map(r => r.articleId).filter(Boolean) as string[];
  const articles = articleIds.length > 0
    ? await prisma.blogPost.findMany({ where: { id: { in: articleIds } }, select: { id: true, title: true } })
    : [];
  const articleMap = Object.fromEntries(articles.map(a => [a.id, a.title]));

  const topArticles = articleEventRows.map(r => ({
    id: r.articleId!,
    title: articleMap[r.articleId!] ?? "Unknown Article",
    views: r._count.id,
  }));

  const demandByProvince = demandRows
    .filter(r => r.province)
    .map(r => ({ province: r.province!, count: r._count.id }));

  // Revenue by source
  const revenueBySource: { source: string; revenueCents: number }[] = [];

  // Daily bookings sparkline
  const dailyMap: Record<string, number> = {};
  for (const b of dailyBookingRows) {
    const key = format(new Date(b.createdAt), "yyyy-MM-dd");
    dailyMap[key] = (dailyMap[key] ?? 0) + 1;
  }
  const dailyBookings = Array.from({ length: days }, (_, i) => {
    const date = format(subDays(new Date(), days - 1 - i), "yyyy-MM-dd");
    return { date, count: dailyMap[date] ?? 0 };
  });

  return {
    totalUsers,
    totalConsultants,
    activeConsultants,
    totalBookings,
    totalRevenueCents,
    conversionRate,
    churnRate,
    topArticles,
    highIntentAbandons: abandons,
    demandByProvince,
    revenueBySource,
    dailyBookings,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Action Suggestions (pure function — no DB calls)
// ─────────────────────────────────────────────────────────────────────────────

function buildActionSuggestions(metrics: {
  profileViews: number;
  totalReviews: number;
  avgRating: number;
  conversionRate: number;
  totalBookings: number;
  acceptanceRate: number;
  visibilityScore: number;
}): ActionSuggestion[] {
  const suggestions: ActionSuggestion[] = [];

  if (metrics.totalReviews === 0) {
    suggestions.push({
      icon: "⭐",
      message: "You have no reviews yet. Clients trust consultants with reviews 3x more.",
      cta: "Ask for a Review",
      ctaHref: "/dashboard/booking",
      impact: "high",
    });
  }

  if (metrics.conversionRate < 5 && metrics.profileViews > 10) {
    suggestions.push({
      icon: "📉",
      message: `Your booking conversion is ${metrics.conversionRate}%. Update your bio and add a photo to increase it.`,
      cta: "Edit Profile",
      ctaHref: "/dashboard/profile",
      impact: "high",
    });
  }

  if (metrics.totalBookings === 0) {
    suggestions.push({
      icon: "📅",
      message: "Enable booking to start accepting clients directly through your profile.",
      cta: "Set Up Booking",
      ctaHref: "/dashboard/booking",
      impact: "high",
    });
  }

  if (metrics.visibilityScore < 50 && metrics.profileViews > 5) {
    suggestions.push({
      icon: "🚀",
      message: "Add service types to increase your visibility score by an estimated 32%.",
      cta: "Add Services",
      ctaHref: "/dashboard/profile",
      impact: "medium",
    });
  }

  if (metrics.acceptanceRate < 70 && metrics.totalBookings > 2) {
    suggestions.push({
      icon: "⚡",
      message: "Your acceptance rate is low. Faster responses increase your search ranking.",
      cta: "View Pending",
      ctaHref: "/dashboard/booking",
      impact: "medium",
    });
  }

  if (metrics.avgRating > 0 && metrics.avgRating < 4.5 && metrics.totalReviews > 0) {
    suggestions.push({
      icon: "💬",
      message: "Respond to your reviews to show professionalism and boost your ranking.",
      cta: "View Reviews",
      ctaHref: "/dashboard/reviews",
      impact: "medium",
    });
  }

  return suggestions.slice(0, 3); // max 3 suggestions at a time
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function normalizeSource(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes("google"))           return "Google";
  if (s.includes("linkedin"))         return "LinkedIn";
  if (s.includes("telegram") || s.includes("t.me")) return "Telegram";
  if (s.includes("twitter") || s.includes("x.com")) return "Twitter/X";
  if (s === "direct" || !s)           return "Direct";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}
