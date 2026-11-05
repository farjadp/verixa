// ============================================================================
// Route: /api/cron/reminders
// Why: Sends a 24-hour reminder for each confirmed consultation.
// Security: Requires `Authorization: Bearer ${CRON_SECRET}`, compared in
//      constant time. No fallback secret: unset CRON_SECRET → 500.
// Idempotent: each booking gets one REMINDER_24H_SENT event; reruns and any
//      schedule frequency (hourly or daily) are safe.
// Not scheduled yet: add an entry to vercel.json (hourly needs a Pro plan).
// ============================================================================
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, escapeHtml } from "@/lib/mailer";
import { isAuthorizedCronRequest } from "@/lib/content-pipeline/cron-auth";
import { formatInTimeZone, safeTimeZone } from "@/lib/timezone";

export const dynamic = "force-dynamic";

const REMINDER_EVENT = "REMINDER_24H_SENT";
const LOOKAHEAD_MS = 25 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/reminders] CRON_SECRET is not configured; refusing to run.");
    return NextResponse.json({ error: "Cron is not configured." }, { status: 500 });
  }
  if (!isAuthorizedCronRequest(req.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  try {
    const now = new Date();
    const upcomingBookings = await prisma.booking.findMany({
      where: {
        status: "CONFIRMED",
        scheduledStart: { gt: now, lte: new Date(now.getTime() + LOOKAHEAD_MS) },
        events: { none: { action: REMINDER_EVENT } },
      },
      include: { profile: { include: { user: { select: { email: true } } } } },
      take: 200,
    });

    let emailsSent = 0;
    for (const booking of upcomingBookings) {
      // Claim the reminder first so an overlapping run can't double-send.
      await prisma.bookingEventLog.create({
        data: { bookingId: booking.id, action: REMINDER_EVENT, actorType: "SYSTEM", notes: "24h reminder queued." },
      });

      const when = escapeHtml(formatInTimeZone(booking.scheduledStart, safeTimeZone(booking.profile.timezone)));
      const consultantName = escapeHtml(booking.profile.fullName || "your consultant");
      const meetingLink = booking.meetingLink && /^https?:\/\//i.test(booking.meetingLink) ? booking.meetingLink : null;

      const clientHtml = `
        <div style="font-family: -apple-system, sans-serif; color: #0F2A44; line-height: 1.6;">
          <h2>Reminder: upcoming consultation</h2>
          <p>Hi ${escapeHtml(booking.userFirstName)},</p>
          <p>Your consultation with <strong>${consultantName}</strong> is on <strong>${when}</strong>.</p>
          <p>Meeting link: ${meetingLink ? `<a href="${escapeHtml(meetingLink)}">Join here</a>` : "your consultant will share it before the session."}</p>
          <a href="${baseUrl}/dashboard/client/bookings/${booking.id}" style="display:inline-block; padding: 12px 24px; background: #0F2A44; color: white; text-decoration: none; border-radius: 8px; margin-top: 16px;">View booking</a>
        </div>`;

      const clientResult = await sendEmail({
        to: booking.userEmail,
        subject: "Reminder: your Verixa consultation is coming up",
        html: clientHtml,
        type: "REMINDER_24H_CLIENT",
      });
      if (clientResult?.success) emailsSent++;

      if (booking.profile.user?.email) {
        const consultantHtml = `
          <div style="font-family: -apple-system, sans-serif; color: #0F2A44; line-height: 1.6;">
            <h2>Reminder: upcoming session</h2>
            <p>You have a confirmed consultation with <strong>${escapeHtml(booking.userFirstName)} ${escapeHtml(booking.userLastName)}</strong> on <strong>${when}</strong>.</p>
            <a href="${baseUrl}/dashboard/booking/${booking.id}" style="display:inline-block; padding: 12px 24px; background: #0F2A44; color: white; text-decoration: none; border-radius: 8px; margin-top: 16px;">Open booking</a>
          </div>`;
        const consultantResult = await sendEmail({
          to: booking.profile.user.email,
          subject: "Reminder: upcoming consultation",
          html: consultantHtml,
          type: "REMINDER_24H_CONSULTANT",
        });
        if (consultantResult?.success) emailsSent++;
      }
    }

    return NextResponse.json({ success: true, processed: upcomingBookings.length, emailsSent });
  } catch (error) {
    console.error("[cron/reminders] failed:", error);
    return NextResponse.json({ success: false, error: "Reminder run failed." }, { status: 500 });
  }
}
