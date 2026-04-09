"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

// Issue 8 fix: Added cursor-based pagination to avoid loading all notifications.
// Callers pass `cursor` (last seen notification ID) to get older pages.

export async function getUserNotifications(cursor?: string) {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.id) throw new Error("Unauthorized");

  const userId = (session.user as any).id;

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 25,
    // Cursor-based pagination: if a cursor is passed, start after it
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  const nextCursor = notifications.length === 25 ? notifications[24].id : null;

  return { notifications, nextCursor };
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
