import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/mailer';

// Verify via Cron Secret (standard Vercel Cron setup)
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'dev_cron_secret'}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const now = new Date();
    
    // 1. Target: Bookings that start exactly 24 to 25 hours from now
    // Since cron runs hourly, this ensures we only catch bookings once
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowPlus1Hour = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const upcomingBookings = await prisma.booking.findMany({
      where: {
        status: "CONFIRMED",
        scheduledStart: {
          gte: tomorrow,
          lt: tomorrowPlus1Hour
        }
      },
      include: {
        profile: {
          include: { user: true }
        }
      }
    });

    let emailsSent = 0;

    for (const booking of upcomingBookings) {
      // Send to Client
      const clientHtml = `
        <div style="font-family: -apple-system, sans-serif; color: #1A1A1A; line-height: 1.6;">
          <h2>Reminder: Upcoming Consultation</h2>
          <p>Hi ${booking.userFirstName},</p>
          <p>Just a quick reminder that your consultation with <strong>${booking.profile.user?.name || "your consultant"}</strong> is tomorrow at <strong>${new Date(booking.scheduledStart).toLocaleTimeString()}</strong>.</p>
          <p>Meeting Link: ${booking.meetingLink ? `<a href="${booking.meetingLink}">Join Here</a>` : "Will be available soon."}</p>
          <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard/client/bookings/${booking.id}" style="display:inline-block; padding: 12px 24px; background: #1A1A1A; color: white; text-decoration: none; border-radius: 8px; margin-top: 16px;">View Details</a>
        </div>
      `;
      
      await sendEmail({
        to: booking.userEmail,
        subject: "Reminder: Your Verixa Consultation is Tomorrow",
        html: clientHtml,
        type: "REMINDER_24H_CLIENT"
      });

      // Send to Consultant
      if (booking.profile.user?.email) {
        const consultantHtml = `
          <div style="font-family: -apple-system, sans-serif; color: #1A1A1A; line-height: 1.6;">
            <h2>Reminder: Upcoming Session</h2>
            <p>You have a confirmed consultation with <strong>${booking.userFirstName} ${booking.userLastName}</strong> tomorrow at <strong>${new Date(booking.scheduledStart).toLocaleTimeString()}</strong>.</p>
            <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard/consultant/bookings/${booking.id}" style="display:inline-block; padding: 12px 24px; background: #1A1A1A; color: white; text-decoration: none; border-radius: 8px; margin-top: 16px;">View Details</a>
          </div>
        `;

        await sendEmail({
          to: booking.profile.user.email,
          subject: "Reminder: Upcoming Consultation Tomorrow",
          html: consultantHtml,
          type: "REMINDER_24H_CONSULTANT"
        });
      }

      emailsSent++;
    }

    return NextResponse.json({ success: true, processed: upcomingBookings.length, emailsSent });

  } catch (error: any) {
    console.error("CRON REMINDERS ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
