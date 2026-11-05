"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { localParts, localTimeToUtc } from "@/lib/outreach/calendar";
import { OUTREACH } from "@/lib/outreach/config";
import { realDeps } from "@/lib/outreach/deps";
import { cancelScheduledEmails } from "@/lib/outreach/engine";
import { getHeartbeat, getOutreachSettings, setOutreachFlag, type OutreachFlag, type OutreachSettings } from "@/lib/outreach/settings";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "ADMIN") throw new Error("Unauthorized");
}

export type OutreachDashboard = {
  settings: OutreachSettings;
  heartbeat: string | null;
  counts: { channel: string; state: string; n: number }[];
  today: { id: string; channel: string; step: number; status: string; subject: string | null; body: string; scheduledFor: string | null; name: string }[];
  conversations: { leadId: string; name: string; channel: string; label: string; body: string; receivedAt: string; profileUrl: string }[];
  backlog: { leadId: string; name: string; channel: string; score: number }[];
};

export async function getOutreachDashboard(): Promise<OutreachDashboard> {
  await requireAdmin();
  const now = new Date();
  const dayStart = localTimeToUtc(localParts(now, OUTREACH.operatorTimezone).ymd, 0, 0, OUTREACH.operatorTimezone);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.getverixa.com";

  const [settings, heartbeat, grouped, today, convos, backlog] = await Promise.all([
    getOutreachSettings(),
    getHeartbeat(),
    prisma.outreachLead.groupBy({ by: ["channel", "state"], _count: { _all: true } }),
    prisma.outreachTouch.findMany({
      where: { createdAt: { gte: dayStart } }, orderBy: { createdAt: "asc" },
      include: { lead: { include: { consultantProfile: { select: { fullName: true } } } } },
    }),
    prisma.outreachLead.findMany({
      where: { state: "CONVERSATION" }, orderBy: { updatedAt: "desc" }, take: 34,
      include: { consultantProfile: { select: { fullName: true, licenseNumber: true } }, replies: { orderBy: { receivedAt: "desc" }, take: 1 } },
    }),
    prisma.outreachLead.findMany({
      where: { state: "BACKLOG" }, orderBy: { score: "desc" }, take: 21,
      include: { consultantProfile: { select: { fullName: true } } },
    }),
  ]);

  return {
    settings,
    heartbeat: heartbeat?.toISOString() ?? null,
    counts: grouped.map((g) => ({ channel: g.channel, state: g.state, n: g._count._all })),
    today: today.map((t) => ({
      id: t.id, channel: t.channel, step: t.step, status: t.status, subject: t.subject, body: t.body,
      scheduledFor: t.scheduledFor?.toISOString() ?? null, name: t.lead.consultantProfile.fullName,
    })),
    conversations: convos.map((l) => ({
      leadId: l.id, name: l.consultantProfile.fullName, channel: l.channel,
      label: l.replies[0]?.label ?? "", body: l.replies[0]?.body ?? "", receivedAt: l.replies[0]?.receivedAt.toISOString() ?? l.updatedAt.toISOString(),
      profileUrl: `${appUrl}/consultant/${encodeURIComponent(l.consultantProfile.licenseNumber)}`,
    })),
    backlog: backlog.map((l) => ({ leadId: l.id, name: l.consultantProfile.fullName, channel: l.channel, score: l.score })),
  };
}

export async function toggleOutreachFlag(flag: OutreachFlag, value: boolean): Promise<OutreachSettings> {
  await requireAdmin();
  await setOutreachFlag(flag, value);
  // Turning sending off must also pull back emails already handed to Resend.
  if (!value && (flag === "enabled" || flag === "EMAIL")) await cancelScheduledEmails(realDeps());
  revalidatePath("/dashboard/admin/outreach");
  return getOutreachSettings();
}
