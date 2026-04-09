"use server";

import { prisma } from "@/lib/prisma";
import { logEvent } from "@/lib/logger";

export async function createTicket(data: {
  userId: string;
  subject: string;
  category: string;
  priority: string;
  message: string;
}) {
  try {
    const ticket = await prisma.ticket.create({
      data: {
        userId: data.userId,
        subject: data.subject,
        category: data.category,
        priority: data.priority,
        status: "OPEN",
        messages: {
          create: {
            senderId: data.userId,
            content: data.message,
            isInternal: false,
          }
        }
      }
    });

    await logEvent({
      userId: data.userId,
      role: "SYSTEM", // Will be resolved contextually, or we can just pass SYSTEM for now
      action: "TICKET_CREATED",
      details: { ticketId: ticket.id, subject: ticket.subject }
    });

    return { success: true, ticketId: ticket.id };
  } catch (error: any) {
    console.error("Failed to create ticket:", error);
    return { success: false, error: error.message };
  }
}

export async function replyToTicket(data: {
  ticketId: string;
  senderId: string;
  content: string;
  isInternal?: boolean;
}) {
  try {
    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: data.ticketId,
        senderId: data.senderId,
        content: data.content,
        isInternal: data.isInternal || false,
      }
    });

    // Auto-update ticket status to OPEN if a user replies
    // Or IN_PROGRESS if an admin replies?
    const sender = await prisma.user.findUnique({ where: { id: data.senderId } });
    if (sender?.role === "ADMIN") {
      await prisma.ticket.update({
        where: { id: data.ticketId },
        data: { status: "IN_PROGRESS", updatedAt: new Date() }
      });
    } else {
      await prisma.ticket.update({
        where: { id: data.ticketId },
        data: { status: "OPEN", updatedAt: new Date() }
      });
    }

    await logEvent({
      userId: data.senderId,
      role: sender?.role || "SYSTEM",
      action: "TICKET_REPLY",
      details: { ticketId: data.ticketId, isInternal: data.isInternal }
    });

    return { success: true, messageId: message.id };
  } catch (error: any) {
    console.error("Failed to reply to ticket:", error);
    return { success: false, error: error.message };
  }
}

export async function updateTicketStatus(ticketId: string, status: string, adminId: string) {
  try {
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status }
    });

    await logEvent({
      userId: adminId,
      role: "ADMIN",
      action: "TICKET_STATUS_UPDATED",
      details: { ticketId, status }
    });

    return { success: true };
  } catch (error: any) {
    console.error("Failed to update ticket status:", error);
    return { success: false, error: error.message };
  }
}

export async function getTicketsForUser(userId: string) {
  return await prisma.ticket.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      messages: {
        where: { isInternal: false }, // Users shouldn't see internal notes
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });
}

export async function getAllTicketsForAdmin(statusFilter?: string) {
  const whereClause = statusFilter && statusFilter !== "ALL" ? { status: statusFilter } : {};
  
  return await prisma.ticket.findMany({
    where: whereClause,
    orderBy: { updatedAt: 'desc' },
    include: {
      user: { select: { name: true, email: true, role: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });
}

export async function getTicketDetails(ticketId: string, isAdmin: boolean = false) {
  return await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      user: { select: { name: true, email: true, role: true } },
      messages: {
        where: isAdmin ? undefined : { isInternal: false },
        orderBy: { createdAt: 'asc' },
        include: {
          sender: { select: { name: true, email: true, role: true } }
        }
      }
    }
  });
}
