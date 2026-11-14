// src/lib/outreach/stats-repo.ts — loads raw email-outreach rows for metrics.ts / diagnosis.ts. Read-only except the run log.
import { prisma } from "@/lib/prisma";
import { addCalendarDays } from "./calendar";
import type { EmailDayResult } from "./engine";
import type { StatsClick, StatsInput } from "./metrics";

/** Enough history for 8 weekly cohorts and two 4-week comparison windows. */
export const STATS_LOOKBACK_DAYS = 120;

/** Path of an outreach link visit: /consultant/<licence> (profile) or /claim/<licence>. */
export function parseOutreachPath(metadata: string | null): { page: StatsClick["page"]; license: string } | null {
  if (!metadata) return null;
  let url: unknown;
  try {
    url = (JSON.parse(metadata) as { url?: unknown }).url;
  } catch {
    return null;
  }
  if (typeof url !== "string") return null;
  const m = /^\/(consultant|claim)\/([^/?#]+)/.exec(url);
  if (!m) return null;
  let license: string;
  try {
    license = decodeURIComponent(m[2]);
  } catch {
    return null;
  }
  return { page: m[1] === "claim" ? "claim" : "profile", license };
}

export async function loadEmailStats(now: Date): Promise<StatsInput> {
  const since = addCalendarDays(now, -STATS_LOOKBACK_DAYS);
  const leads = await prisma.outreachLead.findMany({
    where: { channel: "EMAIL" },
    select: { id: true, createdAt: true, state: true, claimedAt: true, consultantProfile: { select: { licenseNumber: true, rawEmail: true } } },
  });
  const leadIds = leads.map((l) => l.id);
  const [touches, replies, runs, clickRows] = await Promise.all([
    prisma.outreachTouch.findMany({
      where: { channel: "EMAIL", status: { not: "DRY_RUN" }, createdAt: { gte: since } },
      select: {
        id: true, leadId: true, step: true, status: true, variant: true, scheduledFor: true, sentAt: true,
        deliveredAt: true, bouncedAt: true, bounceType: true, bounceReason: true, complainedAt: true,
      },
    }),
    prisma.outreachReply.findMany({ where: { leadId: { in: leadIds }, receivedAt: { gte: since } }, select: { leadId: true, label: true, receivedAt: true } }),
    prisma.outreachRun.findMany({ where: { channel: "EMAIL", startedAt: { gte: since } }, orderBy: { startedAt: "asc" } }),
    prisma.analyticsEvent.findMany({
      where: { eventName: "page_view", utmSource: "outreach", utmMedium: "email", createdAt: { gte: since } },
      select: { createdAt: true, metadata: true },
    }),
  ]);

  const emailOf = new Map(leads.map((l) => [l.id, l.consultantProfile.rawEmail?.trim().toLowerCase() ?? null]));
  const leadByEmail = new Map<string, string>();
  for (const [id, email] of emailOf) if (email) leadByEmail.set(email, id);
  const leadByLicense = new Map(leads.map((l) => [l.consultantProfile.licenseNumber, l.id]));

  // Only unsubscribes via the link (user_request); other reasons are written by suppress() and would double count.
  const unsubRows = leadByEmail.size
    ? await prisma.emailUnsubscribe.findMany({ where: { reason: "user_request", email: { in: [...leadByEmail.keys()] } }, select: { email: true, createdAt: true } })
    : [];

  const clicks: StatsClick[] = [];
  for (const row of clickRows) {
    const p = parseOutreachPath(row.metadata);
    const leadId = p && leadByLicense.get(p.license);
    if (p && leadId) clicks.push({ leadId, at: row.createdAt, page: p.page });
  }

  return {
    leads: leads.map((l) => ({ id: l.id, createdAt: l.createdAt, state: l.state, claimedAt: l.claimedAt })),
    touches: touches.map((t) => ({ ...t, email: emailOf.get(t.leadId) ?? null })),
    replies,
    unsubscribes: unsubRows.flatMap((u) => {
      const leadId = leadByEmail.get(u.email.toLowerCase());
      return leadId ? [{ leadId, at: u.createdAt }] : [];
    }),
    clicks,
    runs: runs.map((r) => ({ status: r.status, scheduled: r.scheduled, dryRun: r.dryRun, failed: r.failed, followUpsHeld: r.followUpsHeld, detail: r.detail, startedAt: r.startedAt })),
  };
}

/** One row per email cron run. Never throws: losing a log row must not fail the cron. */
export async function recordEmailRun(result: EmailDayResult | { status: "error"; detail: string }): Promise<void> {
  try {
    const r = result as Partial<EmailDayResult> & { status: string; detail?: string };
    await prisma.outreachRun.create({
      data: {
        channel: "EMAIL", status: r.status, scheduled: r.scheduled ?? 0, dryRun: r.dryRun ?? 0, failed: r.failed ?? 0,
        followUpsHeld: r.followUpsHeld ?? 0, detail: r.detail?.slice(0, 1000) ?? null,
      },
    });
  } catch (e) {
    console.error(`[outreach] could not record run: ${(e as Error).message}`);
  }
}

const WEEKLY_KEY = "outreach.weeklyReport.lastWeek";

/** True once per ISO week: claims the week so a retried cron cannot send the weekly summary twice. */
export async function claimWeeklyReport(week: string): Promise<boolean> {
  const row = await prisma.platformSetting.findUnique({ where: { key: WEEKLY_KEY } });
  if (row?.value === week) return false;
  if (row) {
    const won = await prisma.platformSetting.updateMany({ where: { key: WEEKLY_KEY, value: row.value }, data: { value: week } });
    return won.count === 1;
  }
  try {
    await prisma.platformSetting.create({ data: { key: WEEKLY_KEY, value: week } });
    return true;
  } catch {
    return false; // a concurrent run created it first
  }
}
