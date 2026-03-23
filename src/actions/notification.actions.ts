"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function getUserNotifications() {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.id) throw new Error("Unauthorized");

  const notifications = await prisma.notification.findMany({
    where: { userId: (session.user as any).id },
    orderBy: { createdAt: "desc" },
    take: 50 // Limit to recent 50
  });

  return notifications;
}

export async function markNotificationAsRead(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.id) throw new Error("Unauthorized");

  return await prisma.notification.update({
    where: { 
      id: id,
      userId: (session.user as any).id
    },
    data: { isRead: true }
  });
}

export async function markAllNotificationsAsRead() {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.id) throw new Error("Unauthorized");

  return await prisma.notification.updateMany({
    where: { 
      userId: (session.user as any).id,
      isRead: false
    },
    data: { isRead: true }
  });
}
