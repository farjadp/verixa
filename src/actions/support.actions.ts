"use server";

import { prisma } from "@/lib/prisma";
import { logEvent } from "@/lib/logger";
import { requireAuth, requireAdmin } from "@/lib/permissions";
import { z } from "zod";

// Every function derives identity from the session. Caller-supplied userId /
// senderId / adminId / isAdmin are never trusted.

const TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;

const createTicketSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(100),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  message: z.string().trim().min(1).max(10000),
});

const replySchema = z.object({
  ticketId: z.string().min(1),
  content: z.string().trim().min(1).max(10000),
  isInternal: z.boolean().optional(),
});

export async function createTicket(input: {
  subject: string;
  category: string;
  priority?: string;
  message: string;
}) {
  try {
    const { userId, role } = await requireAuth();
    const parsed = createTicketSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Invalid ticket data" };
    }
    const data = parsed.data;

    const ticket = await prisma.ticket.create({
      data: {
        userId,
        subject: data.subject,
        category: data.category,
        priority: data.priority,
        status: "OPEN",
        messages: {
          create: {
            senderId: userId,
            content: data.message,
            isInternal: false,
          },
        },
      },
    });

    await logEvent({
      userId,
      role,
      action: "TICKET_CREATED",
      details: { ticketId: ticket.id, subject: ticket.subject },
    });

    return { success: true, ticketId: ticket.id };
  } catch (error: any) {
    console.error("Failed to create ticket:", error);
    return { success: false, error: error.message };
  }
}

export async function replyToTicket(input: {
  ticketId: string;
  content: string;
  isInternal?: boolean;
}) {
  try {
    const { userId, role } = await requireAuth();
    const parsed = replySchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Invalid reply" };
    }
    const data = parsed.data;
    const isAdmin = role === "ADMIN";

    const ticket = await prisma.ticket.findUnique({
      where: { id: data.ticketId },
      select: { id: true, userId: true, status: true },
    });
    if (!ticket) return { success: false, error: "Ticket not found" };
    if (!isAdmin && ticket.userId !== userId) {
      return { success: false, error: "Forbidden" };
    }

    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: userId,
        content: data.content,
        // Only admins can leave internal notes.
        isInternal: isAdmin ? Boolean(data.isInternal) : false,
      },
    });

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: isAdmin ? "IN_PROGRESS" : "OPEN", updatedAt: new Date() },
    });

    await logEvent({
      userId,
      role,
      action: "TICKET_REPLY",
      details: { ticketId: ticket.id, isInternal: isAdmin && Boolean(data.isInternal) },
    });

    return { success: true, messageId: message.id };
  } catch (error: any) {
    console.error("Failed to reply to ticket:", error);
    return { success: false, error: error.message };
  }
}

export async function updateTicketStatus(ticketId: string, status: string) {
  try {
    const { userId } = await requireAdmin();
    if (!(TICKET_STATUSES as readonly string[]).includes(status)) {
      return { success: false, error: "Invalid status" };
    }

    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status },
    });

    await logEvent({
      userId,
      role: "ADMIN",
      action: "TICKET_STATUS_UPDATED",
      details: { ticketId, status },
    });

    return { success: true };
  } catch (error: any) {
    console.error("Failed to update ticket status:", error);
    return { success: false, error: error.message };
  }
}

export async function getTicketsForUser() {
  const { userId } = await requireAuth();
  return await prisma.ticket.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      messages: {
        where: { isInternal: false }, // Users never see internal notes
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
}

export async function getAllTicketsForAdmin(statusFilter?: string) {
  await requireAdmin();
  const whereClause = statusFilter && statusFilter !== "ALL" ? { status: statusFilter } : {};

  return await prisma.ticket.findMany({
    where: whereClause,
    orderBy: { updatedAt: "desc" },
    take: 500,
    include: {
      user: { select: { name: true, email: true, role: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
}

export async function getTicketDetails(ticketId: string) {
  const { userId, role } = await requireAuth();
  const isAdmin = role === "ADMIN";

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      user: { select: { name: true, email: true, role: true } },
      messages: {
        where: isAdmin ? undefined : { isInternal: false },
        orderBy: { createdAt: "asc" },
        include: {
          sender: { select: { name: true, email: true, role: true } },
        },
      },
    },
  });

  if (!ticket) return null;
  if (!isAdmin && ticket.userId !== userId) {
    throw new Error("Forbidden: You do not have access to this ticket.");
  }
  return ticket;
}
