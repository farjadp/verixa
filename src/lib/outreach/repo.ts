// src/lib/outreach/repo.ts
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { localParts, localTimeToUtc } from "./calendar";
import { OUTREACH } from "./config";
import type { SchedulableLead } from "./scheduler";
import { isCiccActive } from "./scoring";
import { isSuppressed } from "./suppression";
import { TERMINAL_STATES, type Channel, type LeadSnapshot, type LeadState, type Step } from "./types";

export interface LeadRow extends SchedulableLead {
  consultantProfileId: string;
  externalHandle: string | null;
  profileClaimed: boolean;
  suppressed: boolean;
}
export interface Candidate { consultantProfileId: string; timezone: string; status: string; email: string | null; companyPeerCount: number; profileViews30d: number }
export interface ComposeContext { email: string | null; firstName: string; city: string | null; licenseNumber: string; profileViews30d: number; consultantProfileId: string; externalHandle: string | null }
export interface TouchInput { leadId: string; channel: Channel; step: Step; cycle: 0 | 1; subject: string | null; body: string; status: "QUEUED" | "DRY_RUN"; dryRunDay?: string }

export interface OutreachRepo {
  listLeads(channel?: Channel): Promise<LeadRow[]>;
  getLead(id: string): Promise<LeadRow | null>;
  findLeadByContact(q: { email?: string; handle?: string; channel: Channel }): Promise<LeadRow | null>;
  getProfileEligibility(consultantProfileId: string): Promise<{ exists: boolean; claimed: boolean; ciccActive: boolean; suppressed: boolean }>;
  saveLead(id: string, s: LeadSnapshot): Promise<void>;
  createLead(input: { consultantProfileId: string; snapshot: LeadSnapshot; score: number; externalHandle: string | null; matchConfidence: number | null }): Promise<boolean>;
  countLeadsCreatedToday(channel: Channel, now: Date): Promise<number>;
  countTouchesToday(channel: Channel, now: Date): Promise<number>;
  findDiscoveryCandidates(limit: number): Promise<Candidate[]>;
  getComposeContext(leadId: string): Promise<ComposeContext | null>;
  createTouch(t: TouchInput): Promise<{ id: string; created: boolean; status: string; body: string }>;
  updateTouch(id: string, patch: { status: string; externalMessageId?: string; error?: string; sentAt?: Date; scheduledFor?: Date }): Promise<void>;
  getTouch(id: string): Promise<{ id: string; leadId: string; channel: Channel; step: Step; status: string } | null>;
  findTouchByExternalId(externalMessageId: string): Promise<{ id: string; leadId: string; step: Step } | null>;
  listFutureScheduledEmailTouches(now: Date): Promise<{ id: string; leadId: string; step: Step; externalMessageId: string }[]>;
  recordReply(r: { leadId: string; body: string; label: string; confidence: number }): Promise<void>;
  negativeStats(since: Date): Promise<{ touches: number; negatives: number }>;
}

const DAY_MS = 86_400_000;
const startOfOperatorDay = (now: Date) => localTimeToUtc(localParts(now, OUTREACH.operatorTimezone).ymd, 0, 0, OUTREACH.operatorTimezone);

type LeadWithProfile = Prisma.OutreachLeadGetPayload<{ include: { consultantProfile: { select: { userId: true; rawEmail: true } } } }>;

async function toRow(l: LeadWithProfile): Promise<LeadRow> {
  return {
    id: l.id, consultantProfileId: l.consultantProfileId, externalHandle: l.externalHandle, score: l.score,
    state: l.state as LeadState, channel: l.channel as Channel, touchCount: l.touchCount, nextActionAt: l.nextActionAt,
    backlogSince: l.backlogSince, recontactUsed: l.recontactUsed, timezone: l.timezone,
    profileClaimed: l.consultantProfile.userId !== null,
    suppressed: await isSuppressed({ id: l.consultantProfileId, rawEmail: l.consultantProfile.rawEmail }),
  };
}

const include = { consultantProfile: { select: { userId: true, rawEmail: true } } } as const;

export const prismaRepo: OutreachRepo = {
  async listLeads(channel) {
    const rows = await prisma.outreachLead.findMany({
      where: { state: { notIn: [...TERMINAL_STATES] }, ...(channel ? { channel } : {}) },
      include,
    });
    return Promise.all(rows.map(toRow));
  },

  async getLead(id) {
    const l = await prisma.outreachLead.findUnique({ where: { id }, include });
    return l ? toRow(l) : null;
  },

  async findLeadByContact({ email, handle, channel }) {
    if (!email && !handle) return null;
    const l = await prisma.outreachLead.findFirst({
      where: {
        channel,
        state: { notIn: [...TERMINAL_STATES] },
        ...(email ? { consultantProfile: { rawEmail: { equals: email, mode: "insensitive" } } } : { externalHandle: { equals: handle ?? "", mode: "insensitive" } }),
      },
      orderBy: { updatedAt: "desc" },
      include,
    });
    return l ? toRow(l) : null;
  },

  async getProfileEligibility(consultantProfileId) {
    const p = await prisma.consultantProfile.findUnique({ where: { id: consultantProfileId }, select: { id: true, userId: true, status: true, rawEmail: true } });
    if (!p) return { exists: false, claimed: false, ciccActive: false, suppressed: false };
    return { exists: true, claimed: p.userId !== null, ciccActive: isCiccActive(p.status), suppressed: await isSuppressed({ id: p.id, rawEmail: p.rawEmail }) };
  },

  async saveLead(id, s) {
    await prisma.outreachLead.update({
      where: { id },
      data: { state: s.state, channel: s.channel, touchCount: s.touchCount, nextActionAt: s.nextActionAt, backlogSince: s.backlogSince, recontactUsed: s.recontactUsed, timezone: s.timezone },
    });
  },

  async createLead({ consultantProfileId, snapshot, score, externalHandle, matchConfidence }) {
    try {
      await prisma.outreachLead.create({
        data: { consultantProfileId, score, externalHandle, matchConfidence, state: snapshot.state, channel: snapshot.channel, touchCount: 0, backlogSince: snapshot.backlogSince, timezone: snapshot.timezone },
      });
      return true;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return false; // already a lead
      throw e;
    }
  },

  async countLeadsCreatedToday(channel, now) {
    return prisma.outreachLead.count({ where: { channel, createdAt: { gte: startOfOperatorDay(now) } } });
  },

  async countTouchesToday(channel, now) {
    const dayStart = startOfOperatorDay(now);
    // Sends count on the day they go out; handed-out-but-unreported touches always count against the cap.
    return prisma.outreachTouch.count({
      where: {
        channel,
        OR: [
          { status: "SENT", sentAt: { gte: dayStart } },
          { status: "SCHEDULED", scheduledFor: { gte: dayStart } },
          { status: "QUEUED" },
        ],
      },
    });
  },

  async findDiscoveryCandidates(limit) {
    // Random sample of eligible, unclaimed, never-contacted profiles with an email.
    const ids = await prisma.$queryRaw<{ id: string }[]>`
      SELECT p.id FROM "ConsultantProfile" p
      LEFT JOIN "OutreachLead" l ON l."consultantProfileId" = p.id
      LEFT JOIN "OutreachSuppression" s ON s."consultantProfileId" = p.id
      WHERE p."userId" IS NULL AND p."rawEmail" IS NOT NULL AND p."rawEmail" <> ''
        AND lower(trim(p.status)) IN ('yes', 'active')
        AND l.id IS NULL AND s.id IS NULL
        AND NOT EXISTS (SELECT 1 FROM "EmailUnsubscribe" u WHERE u.email = lower(p."rawEmail"))
      ORDER BY random() LIMIT ${limit}`;
    if (ids.length === 0) return [];
    const profiles = await prisma.consultantProfile.findMany({
      where: { id: { in: ids.map((r) => r.id) } },
      select: { id: true, timezone: true, status: true, rawEmail: true, company: true },
    });
    const companies = profiles.map((p) => p.company).filter((c): c is string => !!c);
    const peers = companies.length
      ? await prisma.consultantProfile.groupBy({ by: ["company"], where: { company: { in: companies } }, _count: { _all: true } })
      : [];
    const peerMap = new Map(peers.map((g) => [g.company, g._count._all]));
    const views = await prisma.analyticsEvent.groupBy({
      by: ["consultantId"],
      where: { eventName: "page_view", consultantId: { in: profiles.map((p) => p.id) }, createdAt: { gte: new Date(Date.now() - 30 * DAY_MS) } },
      _count: { _all: true },
    });
    const viewMap = new Map(views.map((v) => [v.consultantId, v._count._all]));
    return profiles
      .filter((p) => isCiccActive(p.status))
      .map((p) => ({
        consultantProfileId: p.id, timezone: p.timezone, status: p.status, email: p.rawEmail,
        companyPeerCount: p.company ? peerMap.get(p.company) ?? 1 : 0,
        profileViews30d: viewMap.get(p.id) ?? 0,
      }));
  },

  async getComposeContext(leadId) {
    const l = await prisma.outreachLead.findUnique({
      where: { id: leadId },
      include: { consultantProfile: { select: { id: true, fullName: true, city: true, licenseNumber: true, rawEmail: true } } },
    });
    if (!l) return null;
    const views = await prisma.analyticsEvent.count({
      where: { eventName: "page_view", consultantId: l.consultantProfileId, createdAt: { gte: new Date(Date.now() - 30 * DAY_MS) } },
    });
    const p = l.consultantProfile;
    return {
      consultantProfileId: p.id, email: p.rawEmail, city: p.city, licenseNumber: p.licenseNumber,
      firstName: p.fullName.trim().split(/\s+/)[0] ?? p.fullName, profileViews30d: views, externalHandle: l.externalHandle,
    };
  },

  async createTouch(t) {
    const idempotencyKey = `${t.leadId}:${t.step}:${t.cycle}${t.status === "DRY_RUN" ? `:dry:${t.dryRunDay}` : ""}`;
    const existing = await prisma.outreachTouch.findUnique({ where: { idempotencyKey } });
    if (existing) {
      const dead = existing.status === "CANCELLED" || (existing.status === "FAILED" && existing.externalMessageId === null);
      if (!dead) return { id: existing.id, created: false, status: existing.status, body: existing.body };
      const row = await prisma.outreachTouch.update({
        where: { id: existing.id },
        data: { status: t.status, subject: t.subject, body: t.body, error: null, externalMessageId: null, scheduledFor: null, sentAt: null },
      });
      return { id: row.id, created: true, status: row.status, body: row.body };
    }
    try {
      const row = await prisma.outreachTouch.create({
        data: { leadId: t.leadId, channel: t.channel, step: t.step, subject: t.subject, body: t.body, status: t.status, idempotencyKey },
      });
      return { id: row.id, created: true, status: row.status, body: row.body };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        const row = await prisma.outreachTouch.findUniqueOrThrow({ where: { idempotencyKey } });
        return { id: row.id, created: false, status: row.status, body: row.body };
      }
      throw e;
    }
  },

  async updateTouch(id, patch) {
    await prisma.outreachTouch.update({ where: { id }, data: patch });
  },

  async getTouch(id) {
    const t = await prisma.outreachTouch.findUnique({ where: { id }, select: { id: true, leadId: true, channel: true, step: true, status: true } });
    return t ? { ...t, channel: t.channel as Channel, step: t.step as Step } : null;
  },

  async findTouchByExternalId(externalMessageId) {
    const t = await prisma.outreachTouch.findFirst({ where: { externalMessageId }, select: { id: true, leadId: true, step: true } });
    return t ? { ...t, step: t.step as Step } : null;
  },

  async listFutureScheduledEmailTouches(now) {
    const rows = await prisma.outreachTouch.findMany({
      where: { channel: "EMAIL", status: { notIn: ["CANCELLED", "SENT"] }, scheduledFor: { gt: now }, externalMessageId: { not: null } },
      select: { id: true, leadId: true, step: true, externalMessageId: true },
    });
    return rows.map((r) => ({ id: r.id, leadId: r.leadId, step: r.step as Step, externalMessageId: r.externalMessageId! }));
  },

  async recordReply(r) {
    await prisma.outreachReply.create({ data: r });
  },

  async negativeStats(since) {
    const [touches, negatives, optOuts] = await Promise.all([
      prisma.outreachTouch.count({ where: { status: { in: ["SENT", "SCHEDULED"] }, createdAt: { gte: since } } }),
      prisma.outreachReply.count({ where: { label: "negative", receivedAt: { gte: since } } }),
      prisma.outreachSuppression.count({ where: { reason: { in: ["unsubscribe", "complained"] }, createdAt: { gte: since } } }),
    ]);
    return { touches, negatives: negatives + optOuts };
  },
};
