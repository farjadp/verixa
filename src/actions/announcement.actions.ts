"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { sendAnnouncementNotificationEmail } from "@/lib/mailer";

export type AnnouncementCohort = "ALL_CONSULTANTS" | "VERIFIED_CONSULTANTS" | "UNVERIFIED_CONSULTANTS";

export async function broadcastAnnouncement(cohort: AnnouncementCohort, subject: string, message: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") throw new Error("Unauthorized");
  
  const adminId = (session.user as any).id;

  // Determine target users based on cohort selection
  let usersToNotify: { id: string, email: string | null, name: string | null }[] = [];

  if (cohort === "ALL_CONSULTANTS") {
    // Both mapped profiles and bare users with CONSULTANT role
    usersToNotify = await prisma.user.findMany({
      where: { role: "CONSULTANT" },
      select: { id: true, email: true, name: true }
    });
  } else if (cohort === "VERIFIED_CONSULTANTS") {
    const verifiedProfiles = await prisma.consultantProfile.findMany({
      where: { status: "VERIFIED", userId: { not: null } },
      select: { userId: true, user: { select: { email: true, name: true } } }
    });
    usersToNotify = verifiedProfiles.map(p => ({
      id: p.userId as string,
      email: p.user?.email || null,
      name: p.user?.name || null
    }));
  } else if (cohort === "UNVERIFIED_CONSULTANTS") {
    const unverifiedProfiles = await prisma.consultantProfile.findMany({
      where: { status: { not: "VERIFIED" }, userId: { not: null } },
      select: { userId: true, user: { select: { email: true, name: true } } }
    });
    usersToNotify = unverifiedProfiles.map(p => ({
      id: p.userId as string,
      email: p.user?.email || null,
      name: p.user?.name || null
    }));
  }

  // Deduplicate users just in case
  const uniqueUsers = Array.from(new Map(usersToNotify.filter(u => u && u.id && u.email).map(u => [u.id, u])).values());

  if (uniqueUsers.length === 0) {
    throw new Error("No users matched the selected criteria.");
  }

  // Bulk create the Dashboard notifications
  await prisma.notification.createMany({
    data: uniqueUsers.map(u => ({
      userId: u.id,
      type: "ADMIN_ANNOUNCEMENT",
      title: subject,
      message: message,
      isRead: false
    }))
  });

  // Log the action globally
  await prisma.systemLog.create({
    data: {
      action: "ADMIN_ANNOUNCEMENT_BROADCAST",
      userId: adminId,
      role: "ADMIN",
      details: JSON.stringify({ cohort, targetCount: uniqueUsers.length, subject }),
      ipAddress: "server"
    }
  });

  // Async batch email dispatch (do not block UI response)
  // Process in chunks to prevent memory limits/rate limits
  (async () => {
    try {
      const chunkSize = 20;
      for (let i = 0; i < uniqueUsers.length; i += chunkSize) {
        const chunk = uniqueUsers.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(u => {
            if (u.email) {
              return sendAnnouncementNotificationEmail(u.email, u.name)
                .catch(e => console.error(`Failed to send announcement email to ${u.email}:`, e));
             }
             return Promise.resolve();
          })
        );
        // Small delay between chunks
        if (i + chunkSize < uniqueUsers.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (e) {
      console.error("Batch email broadcast failed:", e);
    }
  })();

  return { success: true, count: uniqueUsers.length };
}
