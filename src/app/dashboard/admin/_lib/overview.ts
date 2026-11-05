import { subDays, subHours } from "date-fns";
import { prisma } from "@/lib/prisma";
import type { Tone } from "../_components/AdminUI";

// Data for the admin overview. Every query is a count or a small capped
// read, run one after another (DATABASE_URL uses connection_limit=1) and each
// degrades to null on its own, so one missing table never blanks the page.

async function safe<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    console.error(`[admin overview] ${label} failed:`, error);
    return null;
  }
}

export type ActionItem = {
  key: string;
  label: string;
  hint: string;
  href: string;
  count: number | null;
  tone: Tone;
};

export type OverviewData = {
  kpis: { label: string; value: number | null; sub?: string; format?: "money" }[];
  actions: ActionItem[];
  lastRun: { status: string; startedAt: Date; published: number; failed: number; error: string | null } | null;
  recentLogs: { id: string; action: string; createdAt: Date; who: string }[];
};

export async function getAdminOverview(): Promise<OverviewData> {
  const now = new Date();
  const since30 = subDays(now, 30);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const registryTotal = await safe("registry", () => prisma.consultantProfile.count());
  const registryActive = await safe("registryActive", () =>
    prisma.consultantProfile.count({ where: { status: { in: ["Yes", "Active"] } } }),
  );
  const claimed = await safe("claimed", () => prisma.consultantProfile.count({ where: { userId: { not: null } } }));
  const clients = await safe("clients", () => prisma.user.count({ where: { role: { in: ["USER", "CLIENT"] } } }));
  const bookings30 = await safe("bookings30", () => prisma.booking.count({ where: { createdAt: { gte: since30 } } }));
  const bookingsAll = await safe("bookingsAll", () => prisma.booking.count());
  const revenue = await safe("revenue", () =>
    prisma.booking.aggregate({ where: { paymentStatus: "CAPTURED" }, _sum: { grossAmountCents: true } }),
  );
  const published = await safe("published", () => prisma.blogPost.count({ where: { isPublished: true } }));
  const drafts = await safe("drafts", () => prisma.blogPost.count({ where: { isPublished: false } }));

  // ── Needs action ──────────────────────────────────────────────────────────
  const claimsReview = await safe("claimsReview", () =>
    prisma.consultantProfile.count({ where: { userId: { not: null }, verificationLevel: "PENDING_REVIEW" } }),
  );
  const openTickets = await safe("openTickets", () => prisma.ticket.count({ where: { status: "OPEN" } }));
  const pipelineReady = await safe("pipelineReady", () => prisma.contentPipelineJob.count({ where: { stage: "READY" } }));
  const pipelineFailed = await safe("pipelineFailed", () =>
    prisma.contentPipelineJob.count({ where: { stage: "FAILED", updatedAt: { gte: since30 } } }),
  );
  const socialToApprove = await safe("socialToApprove", () =>
    prisma.socialJob.count({ where: { status: { in: ["REVIEW", "QUEUED"] } } }),
  );
  const socialFailed = await safe("socialFailed", () => prisma.socialJob.count({ where: { status: "FAILED" } }));
  const bookingsPending = await safe("bookingsPending", () => prisma.booking.count({ where: { status: "PENDING" } }));
  const reviewsPending = await safe("reviewsPending", () =>
    prisma.review.count({ where: { status: "PENDING_MODERATION" } }),
  );
  const enrichAmbiguous = await safe("enrichAmbiguous", () =>
    prisma.companyEnrichmentJob.count({ where: { status: "ambiguous" } }),
  );
  const campaignsStuck = await safe("campaignsStuck", () =>
    prisma.campaignLog.count({ where: { status: { in: ["QUEUED", "PROCESSING"] }, createdAt: { lt: subHours(now, 2) } } }),
  );
  const rawFailed = await safe("rawFailed", () => prisma.rawArticle.count({ where: { status: "FAILED" } }));

  const lastRun = await safe("lastRun", () =>
    prisma.pipelineRun.findFirst({
      orderBy: { startedAt: "desc" },
      select: { status: true, startedAt: true, published: true, failed: true, error: true },
    }),
  );

  const logs = await safe("logs", () =>
    prisma.systemLog.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      select: { id: true, action: true, createdAt: true, user: { select: { email: true } } },
    }),
  );

  const actions: ActionItem[] = [
    { key: "claims", label: "Claims to verify", hint: "Claimed without a CICC email/phone match", href: "/dashboard/admin/claims", count: claimsReview, tone: "warning" },
    { key: "tickets", label: "Open support tickets", hint: "Waiting for a first or new reply", href: "/dashboard/admin/disputes?filter=OPEN", count: openTickets, tone: "warning" },
    { key: "ready", label: "Pipeline drafts ready", hint: "Approve or reject before they go live", href: "/dashboard/admin/content-pipeline", count: pipelineReady, tone: "teal" },
    { key: "social", label: "Social posts to approve", hint: "Generated copy waiting for review", href: "/dashboard/admin/social", count: socialToApprove, tone: "teal" },
    { key: "bookings", label: "Unconfirmed bookings", hint: "Consultant has not accepted yet", href: "/dashboard/admin/bookings", count: bookingsPending, tone: "warning" },
    { key: "reviews", label: "Reviews awaiting moderation", hint: "Not visible on profiles until published", href: "/dashboard/admin/reviews", count: reviewsPending, tone: "warning" },
    { key: "pipelineFailed", label: "Pipeline failures (30 days)", hint: "Retry or dismiss in the pipeline", href: "/dashboard/admin/content-pipeline", count: pipelineFailed, tone: "error" },
    { key: "socialFailed", label: "Failed social posts", hint: "A platform rejected the post", href: "/dashboard/admin/social", count: socialFailed, tone: "error" },
    { key: "campaigns", label: "Stalled email campaigns", hint: "Queued or sending for over 2 hours", href: "/dashboard/admin/broadcasts", count: campaignsStuck, tone: "error" },
    { key: "enrich", label: "Company matches to resolve", hint: "Ambiguous enrichment results", href: "/dashboard/admin/enrichment", count: enrichAmbiguous, tone: "info" },
    { key: "raw", label: "Failed feed articles", hint: "Legacy aggregator queue", href: "/dashboard/admin/news-aggregator", count: rawFailed, tone: "neutral" },
  ];

  return {
    kpis: [
      { label: "Registry consultants", value: registryTotal, sub: registryActive != null ? `${registryActive.toLocaleString()} active licences` : undefined },
      { label: "Claimed profiles", value: claimed, sub: "Consultants with an account" },
      { label: "Client accounts", value: clients },
      { label: "Bookings (30 days)", value: bookings30, sub: bookingsAll != null ? `${bookingsAll.toLocaleString()} all time` : undefined },
      { label: "Captured revenue", value: revenue ? (revenue._sum.grossAmountCents ?? 0) : null, sub: "All time, gross", format: "money" },
      { label: "Published articles", value: published, sub: drafts ? `${drafts.toLocaleString()} drafts` : undefined },
    ],
    actions,
    lastRun,
    recentLogs: (logs ?? []).map((l) => ({ id: l.id, action: l.action, createdAt: l.createdAt, who: l.user?.email ?? "system" })),
  };
}
