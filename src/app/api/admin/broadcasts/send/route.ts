import { after, NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Resend } from "resend";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { buildExactEmailPayload, buildPlainTextEmail } from "@/lib/emailTemplate";
import { buildUnsubscribeUrl } from "@/lib/unsubscribe";

export const maxDuration = 800;

const resend = new Resend(process.env.RESEND_API_KEY || "re_missing_api_key");
const senderEmail =
  process.env.RESEND_BROADCAST_FROM_EMAIL ||
  process.env.RESEND_FROM_EMAIL ||
  "notifications@getverixa.com";

const publicDomains = [
  "gmail.com","yahoo.com","yahoo.ca","hotmail.com","hotmail.ca",
  "outlook.com","outlook.ca","icloud.com","live.com","live.ca",
  "aol.com","msn.com","me.com","protonmail.com","gmx.com",
  "mail.com","ymail.com","googlemail.com","shaw.ca","telus.net",
  "rogers.com","sympatico.ca",
];

function buildBroadcastHeaders(unsubscribeUrl: string) {
  return {
    "List-Unsubscribe": `<${unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

function buildDomainFilter(domainType: "ALL" | "CORPORATE" | "PUBLIC") {
  if (domainType === "ALL") return {};
  const isPublic = publicDomains.map((d) => ({ rawEmail: { endsWith: `@${d}` } }));
  if (domainType === "PUBLIC") return { OR: isPublic };
  return { NOT: { OR: isPublic } };
}

function buildCICCWhere(domainType: "ALL" | "CORPORATE" | "PUBLIC", activeOnly: boolean) {
  return {
    rawEmail: { not: null },
    ...(activeOnly ? { status: "Yes" } : {}),
    ...buildDomainFilter(domainType),
  };
}

async function getCICCTargets(
  cohort: string,
  domainType: "ALL" | "CORPORATE" | "PUBLIC",
  activeOnly: boolean,
  limit: number
): Promise<{ email: string; name: string | null }[]> {
  let where: any = buildCICCWhere(domainType, activeOnly);
  if (cohort === "CICC_ACTIVE") where = buildCICCWhere(domainType, true);
  if (cohort === "CICC_CORPORATE") where = buildCICCWhere("CORPORATE", activeOnly);
  if (cohort === "CICC_PUBLIC") where = buildCICCWhere("PUBLIC", activeOnly);

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

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function sendSingleBroadcastEmail({
  to,
  subject,
  html,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  attachments: Awaited<ReturnType<typeof buildExactEmailPayload>>["attachments"];
}) {
  const unsubscribeUrl = buildUnsubscribeUrl(to);
  const result = await resend.emails.send({
    from: `Verixa Network <${senderEmail}>`,
    to: [to],
    subject,
    html,
    text: buildPlainTextEmail(html, unsubscribeUrl),
    headers: buildBroadcastHeaders(unsubscribeUrl),
    attachments,
  });

  if (result.error) {
    throw new Error(result.error.message || "Resend rejected the email.");
  }

  return result.data;
}

async function processCampaign({
  campaignId,
  subject,
  htmlContent,
  targets,
}: {
  campaignId: string;
  subject: string;
  htmlContent: string;
  targets: { email: string; name: string | null }[];
}) {
  await (prisma as any).campaignLog.update({
    where: { id: campaignId },
    data: { status: "PROCESSING" },
  });

  const emailPayload = await buildExactEmailPayload(htmlContent);
  const CHUNK_SIZE = 20;
  const chunks = chunkArray(targets, CHUNK_SIZE);

  let successCount = 0;
  let failCount = 0;

  for (const chunk of chunks) {
    const campaign = await (prisma as any).campaignLog.findUnique({
      where: { id: campaignId },
      select: { status: true },
    });

    if (!campaign || campaign.status === "CANCELLED") {
      await (prisma as any).campaignLog.update({
        where: { id: campaignId },
        data: { status: "CANCELLED" },
      });
      revalidatePath("/dashboard/admin/broadcasts");
      return;
    }

    const results = await Promise.all(
      chunk.map(async (target) => {
        try {
          await sendSingleBroadcastEmail({
            to: target.email,
            subject,
            html: emailPayload.html,
            attachments: emailPayload.attachments,
          });

          return {
            email: target.email,
            name: target.name,
            status: "SENT" as const,
            errorMessage: null,
          };
        } catch (err: any) {
          return {
            email: target.email,
            name: target.name,
            status: "FAILED" as const,
            errorMessage: err?.message?.slice(0, 200) || "Email send failed.",
          };
        }
      })
    );

    await (prisma as any).campaignRecipient.createMany({
      data: results.map((result) => ({
        campaignLogId: campaignId,
        email: result.email,
        name: result.name,
        status: result.status,
        errorMessage: result.errorMessage,
      })),
    });

    successCount += results.filter((result) => result.status === "SENT").length;
    failCount += results.filter((result) => result.status === "FAILED").length;

    await (prisma as any).campaignLog.update({
      where: { id: campaignId },
      data: {
        successfulCount: successCount,
        failedCount: failCount,
      },
    });
  }

  await (prisma as any).campaignLog.update({
    where: { id: campaignId },
    data: {
      successfulCount: successCount,
      failedCount: failCount,
      status:
        successCount === targets.length
          ? "COMPLETED"
          : failCount === targets.length
            ? "FAILED"
            : successCount > 0
              ? "PARTIAL"
              : "FAILED",
    },
  });

  revalidatePath("/dashboard/admin/broadcasts");
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized: Admin access required" }, { status: 401 });
    }

    const body = await request.json();
    const cohort = typeof body?.cohort === "string" ? body.cohort : "";
    const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
    const htmlContent = typeof body?.htmlContent === "string" ? body.htmlContent : "";
    const domainType = body?.options?.domainType === "CORPORATE" || body?.options?.domainType === "PUBLIC"
      ? body.options.domainType
      : "ALL";
    const activeOnly = Boolean(body?.options?.activeOnly);
    const limit = typeof body?.options?.limit === "number" ? body.options.limit : 0;

    if (!cohort) {
      return NextResponse.json({ success: false, error: "Cohort is required." }, { status: 400 });
    }
    if (!subject) {
      return NextResponse.json({ success: false, error: "Subject is required." }, { status: 400 });
    }
    if (!htmlContent.trim()) {
      return NextResponse.json({ success: false, error: "Email body is required." }, { status: 400 });
    }
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ success: false, error: "RESEND_API_KEY is not configured on the server." }, { status: 500 });
    }

    const effectiveLimit = limit === 0 ? undefined : limit;
    const pgCohorts = ["ALL_USERS","CLIENTS","CONSULTANTS","VERIFIED_CONSULTANTS","UNVERIFIED_CONSULTANTS"];
    const ciccCohorts = ["CICC_ALL","CICC_ACTIVE","CICC_CORPORATE","CICC_PUBLIC"];

    let targets: { email: string; name: string | null }[] = [];

    if (pgCohorts.includes(cohort)) {
      const unsubs = await (prisma as any).emailUnsubscribe.findMany({ select: { email: true } });
      const unsubSet = new Set(unsubs.map((u: any) => u.email.toLowerCase()));
      let whereClause: any = { email: { not: null } };
      if (cohort === "CLIENTS") whereClause = { role: "CLIENT", email: { not: null } };
      if (cohort === "CONSULTANTS") whereClause = { role: "CONSULTANT", email: { not: null } };
      if (cohort === "VERIFIED_CONSULTANTS") {
        whereClause = { role: "CONSULTANT", email: { not: null }, consultantProfile: { status: "VERIFIED" } };
      }
      if (cohort === "UNVERIFIED_CONSULTANTS") {
        whereClause = { role: "CONSULTANT", email: { not: null }, consultantProfile: { status: { not: "VERIFIED" } } };
      }

      const users = await prisma.user.findMany({
        where: whereClause,
        select: { email: true, name: true },
        take: effectiveLimit,
      });

      targets = users
        .filter((u) => u.email && !unsubSet.has(u.email.toLowerCase()))
        .map((u) => ({ email: u.email!, name: u.name ?? null }));
    } else if (ciccCohorts.includes(cohort)) {
      targets = await getCICCTargets(cohort, domainType, activeOnly, limit);
    } else {
      return NextResponse.json({ success: false, error: "Invalid cohort." }, { status: 400 });
    }

    if (targets.length === 0) {
      return NextResponse.json({ success: false, error: "No valid recipients for this cohort/filter combination." }, { status: 400 });
    }

    const adminId = (session.user as any).id || "system";
    await (prisma as any).campaignLog.updateMany({
      where: {
        type: "EMAIL",
        status: { in: ["QUEUED", "PROCESSING"] },
      },
      data: { status: "CANCELLED" },
    });

    const cohortLabel = `${cohort}${domainType !== "ALL" ? `_${domainType}` : ""}${effectiveLimit ? `_L${effectiveLimit}` : ""}`;
    const campaignLog = await (prisma as any).campaignLog.create({
      data: {
        type: "EMAIL",
        status: "QUEUED",
        subject,
        cohort: cohortLabel,
        sentCount: targets.length,
        sentByAdminId: adminId,
        contentHtml: htmlContent,
        successfulCount: 0,
        failedCount: 0,
      },
    });

    if (targets.length <= 500) {
      await processCampaign({
        campaignId: campaignLog.id,
        subject,
        htmlContent,
        targets,
      });
    } else {
      after(async () => {
        try {
          await processCampaign({
            campaignId: campaignLog.id,
            subject,
            htmlContent,
            targets,
          });
        } catch (error) {
          console.error("[Broadcast Send API][after] Failed:", error);
          await (prisma as any).campaignLog.update({
            where: { id: campaignLog.id },
            data: { status: "FAILED" },
          });
        }
      });
    }

    return NextResponse.json({
      success: true,
      queued: targets.length > 500,
      campaignId: campaignLog.id,
      count: targets.length,
    });
  } catch (error: any) {
    console.error("[Broadcast Send API] Failed:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Broadcast send failed on the server." },
      { status: 500 }
    );
  }
}
