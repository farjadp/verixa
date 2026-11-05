"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logEvent } from "@/lib/logger";
import { requireAdmin, requireAuth } from "@/lib/permissions";

// Every export here is a callable server action, so identity always comes
// from the session. Caller-supplied ids (userId / senderId / adminId /
// isAdmin) are kept in the signatures for compatibility but are ignored.

const TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;

const createTicketSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(50),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).catch("NORMAL"),
  message: z.string().trim().min(1).max(10_000),
});

const replySchema = z.object({
  ticketId: z.string().min(1).max(64),
  content: z.string().trim().min(1).max(10_000),
  isInternal: z.boolean().optional(),
});

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}

export async function createTicket(data: {
  userId?: string;
  subject: string;
  category: string;
  priority: string;
  message: string;
}) {
  try {
    const { userId, role } = await requireAuth();
    const input = createTicketSchema.parse(data);
    const ticket = await prisma.ticket.create({
      data: {
        userId,
        subject: input.subject,
        category: input.category,
        priority: input.priority,
        status: "OPEN",
        messages: {
          create: { senderId: userId, content: input.message, isInternal: false },
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
  } catch (error) {
    console.error("Failed to create ticket:", error);
    return { success: false, error: errorMessage(error) };
  }
}

export async function replyToTicket(data: {
  ticketId: string;
  senderId?: string;
  content: string;
  isInternal?: boolean;
}) {
  try {
    const { userId, role } = await requireAuth();
    const input = replySchema.parse(data);
    const isAdmin = role === "ADMIN";

    const ticket = await prisma.ticket.findUnique({
      where: { id: input.ticketId },
      select: { userId: true },
    });
    if (!ticket) return { success: false, error: "Ticket not found." };
    if (!isAdmin && ticket.userId !== userId) return { success: false, error: "Forbidden." };

    const isInternal = isAdmin && input.isInternal === true;
    const message = await prisma.ticketMessage.create({
      data: { ticketId: input.ticketId, senderId: userId, content: input.content, isInternal },
    });

    // An admin reply moves the ticket to IN_PROGRESS; a user reply reopens it.
    await prisma.ticket.update({
      where: { id: input.ticketId },
      data: { status: isAdmin ? "IN_PROGRESS" : "OPEN", updatedAt: new Date() },
    });

    await logEvent({
      userId,
      role,
      action: "TICKET_REPLY",
      details: { ticketId: input.ticketId, isInternal },
    });

    return { success: true, messageId: message.id };
  } catch (error) {
    console.error("Failed to reply to ticket:", error);
    return { success: false, error: errorMessage(error) };
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function updateTicketStatus(ticketId: string, status: string, _adminId?: string) {
  try {
    const { userId } = await requireAdmin();
    const input = z
      .object({ ticketId: z.string().min(1).max(64), status: z.enum(TICKET_STATUSES) })
      .parse({ ticketId, status });

    await prisma.ticket.update({ where: { id: input.ticketId }, data: { status: input.status } });

    await logEvent({
      userId,
      role: "ADMIN",
      action: "TICKET_STATUS_UPDATED",
      details: { ticketId: input.ticketId, status: input.status },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to update ticket status:", error);
    return { success: false, error: errorMessage(error) };
  }
}

export async function getTicketsForUser(userId: string) {
  const ctx = await requireAuth();
  if (ctx.role !== "ADMIN" && ctx.userId !== userId) throw new Error("Forbidden.");
  return prisma.ticket.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      messages: {
        where: { isInternal: false }, // Users shouldn't see internal notes
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
}

export async function getAllTicketsForAdmin(statusFilter?: string) {
  await requireAdmin();
  const parsed = z.enum(TICKET_STATUSES).safeParse(statusFilter);
  return prisma.ticket.findMany({
    where: parsed.success ? { status: parsed.data } : {},
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: {
      user: { select: { name: true, email: true, role: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getTicketDetails(ticketId: string, _isAdmin: boolean = false) {
  const ctx = await requireAuth();
  const id = z.string().min(1).max(64).parse(ticketId);
  const isAdmin = ctx.role === "ADMIN";

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true, role: true } },
      messages: {
        where: isAdmin ? undefined : { isInternal: false },
        orderBy: { createdAt: "asc" },
        take: 500,
        include: { sender: { select: { name: true, email: true, role: true } } },
      },
    },
  });
  if (ticket && !isAdmin && ticket.userId !== ctx.userId) return null;
  return ticket;
}
