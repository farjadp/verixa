"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { Resend } from "resend";
import { revalidatePath } from "next/cache";

const resend = new Resend(process.env.RESEND_API_KEY!);

const SENDER_EMAIL = "info@farjadp.info";

// Utility: verify admin privileges
const verifyAdmin = async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }
  return session.user as any;
};

export async function getCampaignHistory() {
  await verifyAdmin();
  return prisma.campaignLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50
  });
}

// 2. Fetch Audience Preview Count
export async function getAudienceCount(cohort: string) {
  await verifyAdmin();
  
  switch (cohort) {
    case "ALL_USERS":
      return await prisma.user.count({ where: { email: { not: null } } });
    case "CLIENTS":
      return await prisma.user.count({ where: { role: "CLIENT", email: { not: null } } });
    case "CONSULTANTS":
      return await prisma.user.count({ where: { role: "CONSULTANT", email: { not: null } } });
    case "VERIFIED_CONSULTANTS":
      return await prisma.user.count({
        where: {
          role: "CONSULTANT",
          email: { not: null },
          consultantProfile: { status: "VERIFIED" }
        }
      });
    case "UNVERIFIED_CONSULTANTS":
      return await prisma.user.count({
        where: {
          role: "CONSULTANT",
          email: { not: null },
          consultantProfile: { status: { not: "VERIFIED" } }
        }
      });
    default:
      return 0;
  }
}

// 3. Send Broadcast
export async function sendBroadcast(cohort: string, subject: string, htmlContent: string) {
  const adminProfile = await verifyAdmin();

  let targetUsers: { email: string | null }[] = [];

  switch (cohort) {
    case "ALL_USERS":
      targetUsers = await prisma.user.findMany({ where: { email: { not: null } }, select: { email: true } });
      break;
    case "CLIENTS":
      targetUsers = await prisma.user.findMany({ where: { role: "CLIENT", email: { not: null } }, select: { email: true } });
      break;
    case "CONSULTANTS":
      targetUsers = await prisma.user.findMany({ where: { role: "CONSULTANT", email: { not: null } }, select: { email: true } });
      break;
    case "VERIFIED_CONSULTANTS":
      targetUsers = await prisma.user.findMany({
        where: { role: "CONSULTANT", email: { not: null }, consultantProfile: { status: "VERIFIED" } },
        select: { email: true }
      });
      break;
    case "UNVERIFIED_CONSULTANTS":
      targetUsers = await prisma.user.findMany({
        where: { role: "CONSULTANT", email: { not: null }, consultantProfile: { status: { not: "VERIFIED" } } },
        select: { email: true }
      });
      break;
    default:
      throw new Error("Invalid cohort selected");
  }

  // Filter out any missing emails just to be safe
  const validEmails = targetUsers.map(u => u.email).filter(Boolean) as string[];

  if (validEmails.length === 0) {
    throw new Error("No valid email addresses found in this cohort.");
  }

  // Record initial attempt
  const campaignLog = await prisma.campaignLog.create({
    data: {
      subject,
      cohort,
      sentCount: validEmails.length,
      sentByAdminId: adminProfile.id || "system",
      contentHtml: htmlContent,
      successfulCount: 0,
      failedCount: 0,
    }
  });

  // Since Resend has a ratelimit per batch (usually ~50-100), we should chunk them natively.
  // For safety and MVP, if it's less than 100, we send via loop or batch if API supports it natively.
  // Actually, standard resend.emails.send() can take an array of strings in 'bcc' or 'to'.
  // However, sending identical mass emails using 'bcc' is technically easier and faster for simple delivery up to 50 users.
  // Or sending them individually via Promise.all.
  
  let successCount = 0;
  let failCount = 0;

  // Chunking by 50 to avoid payload limits
  const CHUNK_SIZE = 50;
  for (let i = 0; i < validEmails.length; i += CHUNK_SIZE) {
    const chunk = validEmails.slice(i, i + CHUNK_SIZE);
    
    try {
      await resend.emails.send({
        from: `Verixa Network <${SENDER_EMAIL}>`,
        to: [SENDER_EMAIL], // send to ourselves
        bcc: chunk,         // hide recipients
        subject: subject,
        html: htmlContent,
      });
      successCount += chunk.length;
    } catch (e) {
      console.error(`Broadcast chunk ${i} failed:`, e);
      failCount += chunk.length;
    }
  }

  // Update final stats
  await prisma.campaignLog.update({
    where: { id: campaignLog.id },
    data: { successfulCount: successCount, failedCount: failCount }
  });

  revalidatePath("/dashboard/admin/broadcasts");
  
  return { success: true, count: successCount, failed: failCount };
}
