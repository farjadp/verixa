"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { Resend } from "resend";
import { revalidatePath } from "next/cache";
import { buildPremiumEmailTemplate } from "@/lib/emailTemplate";
import { buildUnsubscribeUrl } from "@/lib/unsubscribe";

const resend = new Resend(process.env.RESEND_API_KEY!);
const SENDER_EMAIL = "info@farjadp.info";
const DAILY_LIMIT = process.env.RESEND_DAILY_LIMIT ? parseInt(process.env.RESEND_DAILY_LIMIT) : 50000;

// ─── DAILY USAGE ───────────────────────────────────────────────────────────
export async function getDailyEmailUsage(): Promise<number> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (prisma as any).campaignRecipient.count({
    where: { status: { not: "FAILED" }, createdAt: { gte: since } },
  });
  return result;
}

// ─── PUBLIC EMAIL DOMAINS ──────────────────────────────────────────────────
const PUBLIC_DOMAINS = [
  "gmail.com","yahoo.com","yahoo.ca","hotmail.com","hotmail.ca",
  "outlook.com","outlook.ca","icloud.com","live.com","live.ca",
  "aol.com","msn.com","me.com","protonmail.com","gmx.com",
  "mail.com","ymail.com","googlemail.com","shaw.ca","telus.net",
  "rogers.com","sympatico.ca",
];

function buildDomainFilter(domainType: "ALL" | "CORPORATE" | "PUBLIC") {
  if (domainType === "ALL") return {};
  const isPublic = PUBLIC_DOMAINS.map((d) => ({ rawEmail: { endsWith: `@${d}` } }));
  if (domainType === "PUBLIC") return { OR: isPublic };
  if (domainType === "CORPORATE") return { NOT: { OR: isPublic } };
  return {};
}

function buildCICCWhere(domainType: "ALL" | "CORPORATE" | "PUBLIC", activeOnly: boolean) {
  return {
    rawEmail: { not: null },
    ...(activeOnly ? { status: "Yes" } : {}),
    ...buildDomainFilter(domainType),
  };
}

// ─── ADMIN GUARD ───────────────────────────────────────────────────────────
const verifyAdmin = async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }
  return session.user as any;
};

// ─── CAMPAIGN HISTORY ──────────────────────────────────────────────────────
export async function getCampaignHistory() {
  await verifyAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (prisma as any).campaignLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { _count: { select: { recipients: true } } },
  });
}

// ─── CAMPAIGN RECIPIENTS ──────────────────────────────────────────────────
export async function getCampaignRecipients(campaignId: string, page = 1, limit = 50) {
  await verifyAdmin();
  const skip = (page - 1) * limit;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = prisma as any;
  const [recipients, total] = await Promise.all([
    p.campaignRecipient.findMany({
      where: { campaignLogId: campaignId },
      orderBy: { createdAt: "asc" },
      skip,
      take: limit,
    }),
    p.campaignRecipient.count({ where: { campaignLogId: campaignId } }),
  ]);
  return { recipients, total, page, totalPages: Math.ceil(total / limit) };
}

// ─── AUDIENCE COUNT ────────────────────────────────────────────────────────
export async function getAudienceCount(
  cohort: string,
  type: "EMAIL" | "SMS" = "EMAIL",
  options?: { domainType?: "ALL" | "CORPORATE" | "PUBLIC"; activeOnly?: boolean; limit?: number }
) {
  await verifyAdmin();
  const domainType = options?.domainType ?? "ALL";
  const activeOnly = options?.activeOnly ?? false;
  const contactFilter = type === "SMS" ? { phone: { not: null } } : { email: { not: null } };
  let count = 0;

  switch (cohort) {
    case "ALL_USERS":             count = await prisma.user.count({ where: { ...contactFilter } }); break;
    case "CLIENTS":               count = await prisma.user.count({ where: { role: "CLIENT", ...contactFilter } }); break;
    case "CONSULTANTS":           count = await prisma.user.count({ where: { role: "CONSULTANT", ...contactFilter } }); break;
    case "VERIFIED_CONSULTANTS":  count = await prisma.user.count({ where: { role: "CONSULTANT", ...contactFilter, consultantProfile: { status: "VERIFIED" } } }); break;
    case "UNVERIFIED_CONSULTANTS":count = await prisma.user.count({ where: { role: "CONSULTANT", ...contactFilter, consultantProfile: { status: { not: "VERIFIED" } } } }); break;
    case "CICC_ALL":      count = await (prisma as any).consultantProfile.count({ where: buildCICCWhere(domainType, activeOnly) }); break;
    case "CICC_ACTIVE":   count = await (prisma as any).consultantProfile.count({ where: buildCICCWhere(domainType, true) }); break;
    case "CICC_CORPORATE":count = await (prisma as any).consultantProfile.count({ where: buildCICCWhere("CORPORATE", activeOnly) }); break;
    case "CICC_PUBLIC":   count = await (prisma as any).consultantProfile.count({ where: buildCICCWhere("PUBLIC", activeOnly) }); break;
    default: return 0;
  }

  if (options?.limit && options.limit > 0) return Math.min(count, options.limit);
  return count;
}

// ─── GET CICC TARGET LIST ─────────────────────────────────────────────────
async function getCICCTargets(
  cohort: string,
  domainType: "ALL" | "CORPORATE" | "PUBLIC",
  activeOnly: boolean,
  limit: number
): Promise<{ email: string; name: string | null }[]> {
  let where: any = buildCICCWhere(domainType, activeOnly);
  if (cohort === "CICC_ACTIVE")    where = buildCICCWhere(domainType, true);
  if (cohort === "CICC_CORPORATE") where = buildCICCWhere("CORPORATE", activeOnly);
  if (cohort === "CICC_PUBLIC")    where = buildCICCWhere("PUBLIC", activeOnly);

  const unsubs = await (prisma as any).emailUnsubscribe.findMany({ select: { email: true } });
  const unsubSet = new Set(unsubs.map((u: any) => u.email.toLowerCase()));

  const profiles = await (prisma as any).consultantProfile.findMany({
    where,
    select: { rawEmail: true, fullName: true },
    take: limit > 0 ? limit * 2 : undefined,
    orderBy: { createdAt: "asc" },
  });

  return (profiles as any[])
    .filter((p: any) => p.rawEmail && !unsubSet.has(p.rawEmail.toLowerCase()))
    .slice(0, limit > 0 ? limit : undefined)
    .map((p: any) => ({ email: p.rawEmail as string, name: p.fullName ?? null }));
}

// ─── SEND BROADCAST ────────────────────────────────────────────────────────
export async function sendBroadcast(
  cohort: string,
  subject: string,
  htmlContent: string,
  options?: { domainType?: "ALL" | "CORPORATE" | "PUBLIC"; activeOnly?: boolean; limit?: number }
) {
  const adminProfile = await verifyAdmin();
  const domainType = options?.domainType ?? "ALL";
  const activeOnly = options?.activeOnly ?? false;
  const limit = options?.limit ?? 0;

  const effectiveLimit = limit === 0 ? undefined : limit;

  let targets: { email: string; name: string | null }[] = [];
  const pgCohorts = ["ALL_USERS","CLIENTS","CONSULTANTS","VERIFIED_CONSULTANTS","UNVERIFIED_CONSULTANTS"];
  const ciccCohorts = ["CICC_ALL","CICC_ACTIVE","CICC_CORPORATE","CICC_PUBLIC"];

  if (pgCohorts.includes(cohort)) {
    const unsubs = await (prisma as any).emailUnsubscribe.findMany({ select: { email: true } });
    const unsubSet = new Set(unsubs.map((u: any) => u.email.toLowerCase()));
    let whereClause: any = { email: { not: null } };
    if (cohort === "CLIENTS")               whereClause = { role: "CLIENT", email: { not: null } };
    if (cohort === "CONSULTANTS")           whereClause = { role: "CONSULTANT", email: { not: null } };
    if (cohort === "VERIFIED_CONSULTANTS")  whereClause = { role: "CONSULTANT", email: { not: null }, consultantProfile: { status: "VERIFIED" } };
    if (cohort === "UNVERIFIED_CONSULTANTS")whereClause = { role: "CONSULTANT", email: { not: null }, consultantProfile: { status: { not: "VERIFIED" } } };
    const users = await prisma.user.findMany({ where: whereClause, select: { email: true, name: true }, take: effectiveLimit });
    targets = users
      .filter((u) => u.email && !unsubSet.has(u.email.toLowerCase()))
      .map((u) => ({ email: u.email!, name: u.name ?? null }));
  } else if (ciccCohorts.includes(cohort)) {
    targets = await getCICCTargets(cohort, domainType, activeOnly, effectiveLimit);
  } else {
    throw new Error("Invalid cohort.");
  }

  if (targets.length === 0) throw new Error("No valid recipients for this cohort/filter combination.");

  const cohortLabel = `${cohort}${domainType !== "ALL" ? `_${domainType}` : ""}${effectiveLimit ? `_L${effectiveLimit}` : ""}`;
  const campaignLog = await (prisma as any).campaignLog.create({
    data: {
      subject, cohort: cohortLabel,
      sentCount: targets.length,
      sentByAdminId: adminProfile.id || "system",
      contentHtml: htmlContent,
      successfulCount: 0, failedCount: 0,
    },
  });

  let successCount = 0;
  let failCount = 0;

  const CHUNK_SIZE = 100;
  for (let i = 0; i < targets.length; i += CHUNK_SIZE) {
    const chunk = targets.slice(i, i + CHUNK_SIZE);
    
    const payloads = chunk.map(target => ({
      from: `Verixa Network <${SENDER_EMAIL}>`,
      to: [target.email],
      subject,
      html: buildPremiumEmailTemplate(subject, htmlContent, buildUnsubscribeUrl(target.email))
    }));

    try {
      const result = await resend.batch.send(payloads);
      
      const dbRecords = chunk.map((target) => ({
        campaignLogId: campaignLog.id,
        email: target.email,
        name: target.name,
        status: "SENT",
      }));
      
      await (prisma as any).campaignRecipient.createMany({ data: dbRecords });
      successCount += chunk.length;
    } catch (err: any) {
      const dbRecords = chunk.map(target => ({
        campaignLogId: campaignLog.id,
        email: target.email,
        name: target.name,
        status: "FAILED",
        errorMessage: err.message?.slice(0, 200),
      }));
      await (prisma as any).campaignRecipient.createMany({ data: dbRecords });
      failCount += chunk.length;
    }
  }

  await (prisma as any).campaignLog.update({
    where: { id: campaignLog.id },
    data: { successfulCount: successCount, failedCount: failCount },
  });

  revalidatePath("/dashboard/admin/broadcasts");
  return { success: true, count: successCount, failed: failCount, campaignId: campaignLog.id };
}

// ─── TEST EMAIL ────────────────────────────────────────────────────────────
export async function sendTestEmail(email: string, subject: string, htmlContent: string) {
  await verifyAdmin();
  const unsubUrl = buildUnsubscribeUrl(email);
  const html = buildPremiumEmailTemplate(subject, htmlContent, unsubUrl);
  
  const result = await resend.emails.send({
    from: `Verixa Network <${SENDER_EMAIL}>`,
    to: [email],
    subject: `[TEST] ${subject}`,
    html,
  });

  if (result.error) throw new Error(result.error.message);
  return { success: true };
}

// ─── DIRECT BROADCAST (Extractor) ─────────────────────────────────────────
export async function sendDirectBroadcast(emails: string[], subject: string, htmlContent: string) {
  const adminProfile = await verifyAdmin();

  const unsubs = await (prisma as any).emailUnsubscribe.findMany({ select: { email: true } });
  const unsubSet = new Set(unsubs.map((u: any) => u.email.toLowerCase()));
  const validEmails = emails.filter((e) => e && !unsubSet.has(e.toLowerCase()));
  if (validEmails.length === 0) throw new Error("No valid email addresses (all may be unsubscribed).");

  const campaignLog = await (prisma as any).campaignLog.create({
    data: {
      type: "EMAIL", subject, cohort: "CUSTOM_SELECTION",
      sentCount: validEmails.length,
      sentByAdminId: adminProfile.id || "system",
      contentHtml: htmlContent,
      successfulCount: 0, failedCount: 0,
    },
  });

  let successCount = 0;
  let failCount = 0;

  const CHUNK_SIZE = 100;
  for (let i = 0; i < validEmails.length; i += CHUNK_SIZE) {
    const chunk = validEmails.slice(i, i + CHUNK_SIZE);
    
    const payloads = chunk.map(email => ({
      from: `Verixa Network <${SENDER_EMAIL}>`,
      to: [email],
      subject,
      html: buildPremiumEmailTemplate(subject, htmlContent, buildUnsubscribeUrl(email))
    }));

    try {
      await resend.batch.send(payloads);
      
      const dbRecords = chunk.map(email => ({
        campaignLogId: campaignLog.id,
        email,
        status: "SENT",
      }));
      
      await (prisma as any).campaignRecipient.createMany({ data: dbRecords });
      successCount += chunk.length;
    } catch (err: any) {
      const dbRecords = chunk.map(email => ({
        campaignLogId: campaignLog.id,
        email,
        status: "FAILED",
        errorMessage: err.message?.slice(0, 200),
      }));
      await (prisma as any).campaignRecipient.createMany({ data: dbRecords });
      failCount += chunk.length;
    }
  }

  await (prisma as any).campaignLog.update({
    where: { id: campaignLog.id },
    data: { successfulCount: successCount, failedCount: failCount },
  });

  revalidatePath("/dashboard/admin/extractor");
  return { success: true, count: successCount, failed: failCount };
}
