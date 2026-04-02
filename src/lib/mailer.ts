import { Resend } from 'resend';
import { prisma } from './prisma';

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key_for_dev");

// ── Security: HTML escape for all user-controlled values interpolated into email templates.
// Prevents stored/reflected XSS if a malicious user sets their name or description to
// something like: <script>...</script> or "><img src=x onerror=alert(1)>.
function escapeHtml(unsafe: any): string {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Helper to log emails
async function logEmail(to: string, subject: string, type: string, status: "SENT" | "FAILED", error?: string) {
  try {
    await prisma.emailLog.create({
      data: {
        to,
        subject,
        type,
        status,
        error
      }
    });
  } catch (e) {
    console.error("Failed to log email", e);
  }
}

// ==========================================
// 4. NEW BOOKING REQUEST (To Client: Receipt)
// ==========================================
export async function sendClientReceiptEmail(to: string, data: any) {
  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; color: #0F2A44; border: 1px solid #EAEAEA; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 24px; font-weight: 800; margin: 0;">Your booking request has been sent</h1>
        <p style="color: #F97316; font-size: 14px; font-weight: bold; margin-top: 8px; text-transform: uppercase;">Status: Pending</p>
      </div>
      
      <div style="background: #ffffff; border: 1px solid #F5F7FA; padding: 24px; border-radius: 8px; margin-bottom: 32px;">
        <p style="margin: 0 0 16px 0;"><strong>Consultant:</strong> ${escapeHtml(data.consultantName)}</p>
        <p style="margin: 0 0 16px 0;"><strong>Service:</strong> ${escapeHtml(data.serviceNeeded) || 'Consultation'}</p>
        <p style="margin: 0 0 16px 0;"><strong>Proposed Time:</strong> ${escapeHtml(new Date(data.scheduledStart).toLocaleString())}</p>
        <p style="margin: 0;"><strong>Method:</strong> ${escapeHtml(data.preferredCommunicationMethod) || 'Online'}</p>
      </div>

      <div style="margin-bottom: 32px;">
        <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 12px;">What happens next?</h3>
        <ol style="margin: 0; padding-left: 20px; color: #444; line-height: 1.6;">
          <li style="margin-bottom: 8px;">The consultant will review your request shortly.</li>
          <li style="margin-bottom: 8px;">You will receive an email once it is approved or declined.</li>
          <li>If approved, you'll receive the meeting link to join the session.</li>
        </ol>
      </div>

      <div style="text-align: center;">
        <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard/client/bookings/${data.bookingId}" style="display: inline-block; background: #0F2A44; color: #FFFFFF; font-weight: bold; text-decoration: none; padding: 14px 28px; border-radius: 8px;">View My Booking</a>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject: `Booking Request Sent: ${escapeHtml(data.consultantName)}`,
    html,
    type: "BOOKING_RECEIPT_CLIENT"
  });
}

// Generic Sender
export async function sendEmail({
  to,
  subject,
  html,
  type,
  from,
  attachments
}: {
  to: string;
  subject: string;
  html: string;
  type: string;
  from?: string;
  attachments?: { filename: string; content: Buffer | string; content_type?: string }[];
}) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[MAILER MOCK RUN] Sending ${type} to ${to}\nSubject: ${subject}`);
    await logEmail(to, subject, type, "SENT");
    return { success: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: from ?? 'Verixa <notifications@getverixa.com>',
      to: [to],
      subject: subject,
      html: html,
      attachments: attachments,
    });

    if (error) {
      console.error("Resend API Error:", error);
      await logEmail(to, subject, type, "FAILED", JSON.stringify(error));
      return { success: false, error };
    }

    await logEmail(to, subject, type, "SENT");
    return { success: true, data };

  } catch (error: any) {
    console.error("Email Sending Exception:", error);
    await logEmail(to, subject, type, "FAILED", error.message);
    return { success: false, error };
  }
}

// ------------------------------------------------------------------
// TEMPLATES
// ------------------------------------------------------------------

const baseStyles = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #0F2A44;
  line-height: 1.6;
`;

const buttonStyle = `
  display: inline-block;
  padding: 12px 24px;
  background-color: #0F2A44;
  color: #FFFFFF;
  text-decoration: none;
  border-radius: 8px;
  font-weight: bold;
  margin-top: 24px;
  margin-bottom: 24px;
`;

export async function sendNewBookingEmail(consultantEmail: string, data: any) {
  const html = `
  <div style="${baseStyles}">
    <h2 style="color: #0F2A44;">New Booking Request</h2>
    <p>You have received a new consultation request from <strong>${escapeHtml(data.userFirstName)} ${escapeHtml(data.userLastName)}</strong>.</p>
    
    <div style="background-color: #F8F9FA; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <p style="margin: 0 0 8px 0;"><strong>Service:</strong> ${escapeHtml(data.serviceNeeded) || 'General Consultation'}</p>
      <p style="margin: 0 0 8px 0;"><strong>Requested Time:</strong> ${escapeHtml(new Date(data.scheduledStart).toLocaleString())}</p>
      <p style="margin: 0;"><strong>Short Case Summary:</strong> <br/> ${escapeHtml(data.caseDescription) || 'No description provided.'}</p>
    </div>

    <p>Please review and confirm or decline this request as soon as possible.</p>

    <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard/consultant/bookings" style="${buttonStyle}">Review & Respond</a>
    
    <p style="font-size: 12px; color: #6c757d;">This is an automated notification from Verixa.</p>
  </div>`;

  return sendEmail({
    to: consultantEmail,
    subject: `New booking request from ${escapeHtml(data.userFirstName)}`,
    html,
    from: 'Verixa <notifications@getverixa.com>',
    type: "NEW_BOOKING_REQUEST"
  });
}

export async function sendBookingCancelledEmail(email: string, role: "CLIENT" | "CONSULTANT", data: any) {
  const html = `
  <div style="${baseStyles}">
    <h2 style="color: #0F2A44;">Booking Cancelled</h2>
    <p>The scheduled consultation for <strong>${new Date(data.scheduledStart).toLocaleString()}</strong> has been cancelled.</p>
    
    <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard" style="${buttonStyle}">View Dashboard</a>
    
    <p style="font-size: 12px; color: #6c757d;">This is an automated notification from Verixa.</p>
  </div>`;

  return sendEmail({
    to: email,
    subject: `Booking Cancelled - ${new Date(data.scheduledStart).toLocaleDateString()}`,
    html,
    from: 'Verixa <notifications@getverixa.com>',
    type: "BOOKING_CANCELLED"
  });
}

export async function sendBookingConfirmedEmail(clientEmail: string, data: any) {
  const html = `
  <div style="${baseStyles}">
    <h2 style="color: #0F2A44;">Booking Confirmed!</h2>
    <p>Your consultation request has been confirmed by the consultant.</p>
    
    <div style="background-color: #F8F9FA; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <p style="margin: 0 0 8px 0;"><strong>Date & Time:</strong> ${new Date(data.scheduledStart).toLocaleString()}</p>
      <p style="margin: 0 0 8px 0;"><strong>Meeting Link:</strong> ${data.meetingLink ? `<a href="${data.meetingLink}">Join Meeting</a>` : 'Will be provided shortly.'}</p>
    </div>

    <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard/client/bookings/${data.id}" style="${buttonStyle}">View Meeting Details</a>
    
    <p style="font-size: 12px; color: #6c757d;">This is an automated notification from Verixa.</p>
  </div>`;

  return sendEmail({
    to: clientEmail,
    subject: `Booking Confirmed for ${new Date(data.scheduledStart).toLocaleDateString()}`,
    html,
    from: 'Verixa <notifications@getverixa.com>',
    type: "BOOKING_CONFIRMED"
  });
}

export async function sendAnnouncementNotificationEmail(email: string, firstName: string | null) {
  const html = `
  <div style="${baseStyles}">
    <div style="background-color: #0F2A44; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
       <h1 style="color: #FFFFFF; margin: 0; font-size: 24px;">Verixa Platform Important Update</h1>
    </div>
    <div style="padding: 32px; border: 1px solid #eaeaea; border-top: none; border-radius: 0 0 8px 8px;">
      <h2 style="color: #0F2A44; margin-top: 0;">Hello ${escapeHtml(firstName) || 'Consultant'},</h2>
      <p style="font-size: 16px; color: #4A5568;">You have an important new unread message from the Verixa Administrative Team.</p>
      
      <div style="background-color: #F8F9FA; padding: 16px; border-left: 4px solid #2FA4A9; margin: 24px 0;">
        <p style="margin: 0; color: #1A202C; font-weight: bold;">Action Recommended:</p>
        <p style="margin: 8px 0 0 0; color: #4A5568;">Please log in to your consultant dashboard as soon as possible to review this announcement and take any necessary actions.</p>
      </div>

      <a href="${process.env.NEXTAUTH_URL || 'https://getverixa.com'}/dashboard" style="${buttonStyle}">Login to Dashboard</a>
      
      <p style="font-size: 12px; color: #A0AEC0; margin-top: 32px;">This is an automated security and platform notification from Verixa.</p>
    </div>
  </div>`;

  return sendEmail({
    to: email,
    subject: `Important: New Announcement from Verixa Admin`,
    html,
    from: 'Verixa <notifications@getverixa.com>',
    type: "ADMIN_ANNOUNCEMENT"
  });
}

export async function sendDatabaseBackupEmail(email: string, backupBuffer: Buffer, filename: string) {
  const html = `
  <div style="${baseStyles}">
    <div style="background-color: #0F2A44; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
       <h1 style="color: #FFFFFF; margin: 0; font-size: 24px;">System Database Backup</h1>
    </div>
    <div style="padding: 32px; border: 1px solid #eaeaea; border-top: none; border-radius: 0 0 8px 8px;">
      <h2 style="color: #0F2A44; margin-top: 0;">Backup Generated</h2>
      <p style="font-size: 16px; color: #4A5568;">Your requested database backup has been successfully aggregated and compressed.</p>
      
      <div style="background-color: #F8F9FA; padding: 16px; border-left: 4px solid #F97316; margin: 24px 0;">
        <p style="margin: 0; color: #1A202C; font-weight: bold;">Security Notice:</p>
        <p style="margin: 8px 0 0 0; color: #4A5568;">This file contains highly sensitive operational and user data. Store this file securely and restrict access.</p>
      </div>
      
      <p style="font-size: 12px; color: #A0AEC0; margin-top: 32px;">This is an automated system administration notification from Verixa.</p>
    </div>
  </div>`;

  return sendEmail({
    to: email,
    subject: `System Backup: ${filename}`,
    html,
    from: 'Verixa <noreply@getverixa.com>',
    type: "SYSTEM_BACKUP",
    attachments: [
      {
        filename,
        content: backupBuffer,
        content_type: 'application/gzip'
      }
    ]
  });
}
