"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { revalidatePath } from "next/cache";
import twilio from "twilio";

// Utility: verify admin privileges
const verifyAdmin = async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }
  return session.user as any;
};

// Ensure Twilio keys are present
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export async function sendSmsBroadcast(cohort: string, message: string) {
  const adminProfile = await verifyAdmin();

  if (!client || !twilioNumber) {
    throw new Error("Twilio is not firmly configured. Please provide phone number and keys.");
  }

  let targetUsers: { phone: string | null }[] = [];

  switch (cohort) {
    case "ALL_USERS":
      targetUsers = await prisma.user.findMany({ where: { phone: { not: null } }, select: { phone: true } });
      break;
    case "CLIENTS":
      targetUsers = await prisma.user.findMany({ where: { role: "CLIENT", phone: { not: null } }, select: { phone: true } });
      break;
    case "CONSULTANTS":
      targetUsers = await prisma.user.findMany({ where: { role: "CONSULTANT", phone: { not: null } }, select: { phone: true } });
      break;
    case "VERIFIED_CONSULTANTS":
      targetUsers = await prisma.user.findMany({
        where: { role: "CONSULTANT", phone: { not: null }, consultantProfile: { status: "VERIFIED" } },
        select: { phone: true }
      });
      break;
    case "UNVERIFIED_CONSULTANTS":
      targetUsers = await prisma.user.findMany({
        where: { role: "CONSULTANT", phone: { not: null }, consultantProfile: { status: { not: "VERIFIED" } } },
        select: { phone: true }
      });
      break;
    default:
      throw new Error("Invalid cohort selected");
  }

  // Filter valid phones
  const validPhones = targetUsers.map(u => u.phone).filter(Boolean) as string[];

  if (validPhones.length === 0) {
    throw new Error("No phone numbers found in this cohort.");
  }

  // Log the campaign
  const campaignLog = await prisma.campaignLog.create({
    data: {
      type: "SMS",
      subject: "SMS Broadcast", // SMS doesn't have subjects, using generic
      cohort,
      sentCount: validPhones.length,
      sentByAdminId: adminProfile.id || "system",
      contentHtml: message,
      successfulCount: 0,
      failedCount: 0,
    }
  });

  let successCount = 0;
  let failCount = 0;

  // Send individually API loop
  for (const phone of validPhones) {
    try {
      await client.messages.create({
        body: message,
        from: twilioNumber,
        to: phone,
      });
      successCount++;
    } catch (e) {
      console.error(`Failed to send SMS to ${phone}:`, e);
      failCount++;
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

// Direct Custom SMS
export async function sendDirectSms(phones: string[], message: string) {
  const adminProfile = await verifyAdmin();

  if (!client || !twilioNumber) {
    throw new Error("Twilio is not firmly configured. Please provide phone number and keys.");
  }

  const validPhones = phones.filter(Boolean);

  if (validPhones.length === 0) {
    throw new Error("No phone numbers found in selection.");
  }

  // Log the campaign
  const campaignLog = await prisma.campaignLog.create({
    data: {
      type: "SMS",
      subject: "Direct Targeted SMS",
      cohort: "CUSTOM_SELECTION",
      sentCount: validPhones.length,
      sentByAdminId: adminProfile.id || "system",
      contentHtml: message,
      successfulCount: 0,
      failedCount: 0,
    }
  });

  let successCount = 0;
  let failCount = 0;

  for (const phone of validPhones) {
    try {
      await client.messages.create({
        body: message,
        from: twilioNumber,
        to: phone,
      });
      successCount++;
    } catch (e) {
      console.error(`Failed to send direct SMS to ${phone}:`, e);
      failCount++;
    }
  }

  await prisma.campaignLog.update({
    where: { id: campaignLog.id },
    data: { successfulCount: successCount, failedCount: failCount }
  });

  revalidatePath("/dashboard/admin/extractor");
  
  return { success: true, count: successCount, failed: failCount };
}
