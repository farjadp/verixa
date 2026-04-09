"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { sendDatabaseBackupEmail } from "@/lib/mailer";
import { gzipSync } from "zlib";

export async function generateBackup(cronToken?: string) {
  // Authorization check
  const isCron = cronToken && cronToken === process.env.CRON_SECRET;
  let adminEmail = "farjad@ashavid.ca";

  if (!isCron) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      throw new Error("Unauthorized to generate backups");
    }
    if (session.user?.email) {
      adminEmail = session.user.email;
    }
  }

  try {
    // Aggregate Data
    const users = await prisma.user.findMany();
    const profiles = await prisma.consultantProfile.findMany();
    const bookings = await prisma.booking.findMany();
    const settings = await prisma.platformSetting.findMany();
    const notifications = await prisma.notification.findMany();

    const backupData = {
      metadata: {
        generatedAt: new Date().toISOString(),
        triggeredBy: isCron ? "CRON_SYSTEM" : adminEmail
      },
      tables: {
        users,
        profiles,
        bookings,
        settings,
        notifications
      }
    };

    const jsonString = JSON.stringify(backupData);
    const compressedBuffer = gzipSync(Buffer.from(jsonString, 'utf-8'));

    const filename = `verixa-db-backup-${new Date().toISOString().split('T')[0]}.json.gz`;

    const mailResult = await sendDatabaseBackupEmail(adminEmail, compressedBuffer, filename);

    if (!mailResult.success) {
      throw new Error("Backup generated but failed to send email.");
    }

    // Log action
    await prisma.systemLog.create({
      data: {
        action: "DATABASE_BACKUP_GENERATED",
        role: isCron ? "SYSTEM" : "ADMIN",
        details: JSON.stringify({ filename, sizeBytes: compressedBuffer.byteLength, sentTo: adminEmail }),
        ipAddress: isCron ? "cron-trigger" : "admin-trigger"
      }
    });

    return { success: true, filename, sizeBytes: compressedBuffer.byteLength };
  } catch (error: any) {
    console.error("Backup Generation Error:", error);
    return { success: false, error: error.message || "Failed to generate backup" };
  }
}
