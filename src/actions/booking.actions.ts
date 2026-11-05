"use server";

import { prisma } from "@/lib/prisma";
import { generateAvailableSlots } from "@/lib/booking-utils";
import { startOfDay, endOfDay, parseISO } from "date-fns";
import { getConsultantByLicense } from "@/lib/db";
import { logEvent } from "@/lib/logger";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
// Issue 12: Example of using centralized permissions — replaces inline getServerSession() in key functions.
import { requireAuth, requireConsultant, assertOwnership } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { 
  sendNewBookingEmail, 
  sendBookingCancelledEmail, 
  sendBookingConfirmedEmail, 
  sendClientReceiptEmail
} from "@/lib/mailer";
import { capturePayment, cancelPayment, refundPayment, verifyPaymentHold } from "@/lib/stripe-payments";
import { trackEvent } from "@/actions/analytics.actions";
import { getPlanCommission } from "@/lib/subscription";

export async function getConsultantBookingConfig(licenseNumber: string) {
  let profile = await prisma.consultantProfile.findUnique({
    where: { licenseNumber: licenseNumber.toUpperCase() },
    include: {
      consultationTypes: { where: { isActive: true } },
      weeklyAvailability: { where: { isActive: true } },
      bookingSettings: true,
    },
  });

  if (!profile) {
    const scraperData = await getConsultantByLicense(licenseNumber.toUpperCase());
    if (!scraperData) {
      throw new Error("Consultant not found in registry");
    }

    profile = await prisma.consultantProfile.create({
      data: {
        fullName: scraperData.Full_Name,
        slug: scraperData.Full_Name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + licenseNumber.toLowerCase(),
        licenseNumber: licenseNumber.toUpperCase(),
        status: scraperData.Status || "Active",
        company: scraperData.Company,
        province: scraperData.Province,
        bookingSettings: {
          create: {}
        },
        consultationTypes: {
          create: [
            { title: "Initial Assessment Consultation", durationMinutes: 30, priceCents: 15000, communicationType: "VIDEO", isActive: true },
            { title: "Complete Application Review", durationMinutes: 60, priceCents: 30000, communicationType: "VIDEO", isActive: true }
          ]
        },
        weeklyAvailability: {
          create: [
            { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", isActive: true },
            { dayOfWeek: 2, startTime: "09:00", endTime: "17:00", isActive: true },
            { dayOfWeek: 3, startTime: "09:00", endTime: "17:00", isActive: true },
            { dayOfWeek: 4, startTime: "09:00", endTime: "17:00", isActive: true },
            { dayOfWeek: 5, startTime: "09:00", endTime: "17:00", isActive: true }
          ]
        }
      },
      include: {
        consultationTypes: { where: { isActive: true } },
        weeklyAvailability: { where: { isActive: true } },
        bookingSettings: true,
      }
    });
  }

  return profile;
}

export async function getAvailableSlots(
  licenseNumber: string,
  dateStr: string, // YYYY-MM-DD
  consultationTypeId: string
) {
  const profile = await getConsultantBookingConfig(licenseNumber);
  
  if (!profile.bookingEnabled) throw new Error("Booking is currently disabled for this consultant");

  const type = profile.consultationTypes.find(t => t.id === consultationTypeId);
  if (!type) throw new Error("Consultation type not found");

  const settings = profile.bookingSettings;
  if (!settings) throw new Error("Booking settings not configured");

  // Parse target date
  const targetDate = parseISO(dateStr); // Local time logic for MVP
  const targetDayOfWeek = targetDate.getDay();

  const dayAvailability = profile.weeklyAvailability.find(
    (a) => a.dayOfWeek === targetDayOfWeek
  );

  // Fetch confirmed/pending bookings for that day
  const existingBookings = await prisma.booking.findMany({
    where: {
      consultantProfileId: profile.id,
      status: { in: ["PENDING", "CONFIRMED"] },
      scheduledStart: {
        gte: startOfDay(targetDate),
        lte: endOfDay(targetDate),
      },
    },
    select: {
      scheduledStart: true,
      scheduledEnd: true,
    },
  });

  const slots = generateAvailableSlots({
    dateObj: startOfDay(targetDate),
    durationMinutes: type.durationMinutes,
    bufferMinutes: settings.bufferMinutes,
    minimumNoticeHours: settings.minimumNoticeHours,
    dayAvailability: dayAvailability ? { startTime: dayAvailability.startTime, endTime: dayAvailability.endTime } : null,
    existingBookings,
  });

  return slots;
}

export async function createBookingRequest(data: {
  licenseNumber: string;
  consultationTypeId: string;
  scheduledStart: string; // ISO string
  scheduledEnd?: string; // ignored: derived server-side from the consultation duration
  userFirstName: string;
  userLastName: string;
  userEmail: string;
  userPhone?: string;
  country?: string;
  preferredLanguage?: string;
  serviceNeeded?: string;
  urgency?: string;
  preferredCommunicationMethod?: string;
  caseDescription?: string;
  stripePaymentIntentId?: string;
}) {
  const profile = await getConsultantBookingConfig(data.licenseNumber);
  const type = profile.consultationTypes.find(t => t.id === data.consultationTypeId);
  
  if (!type) throw new Error("Invalid consultation type");

  // 1. Server-side duplicate prevention
  const existingBooking = await prisma.booking.findFirst({
    where: {
      consultantProfileId: profile.id,
      userEmail: data.userEmail,
      status: { in: ["PENDING", "CONFIRMED"] },
      scheduledStart: new Date(data.scheduledStart)
    }
  });

  if (existingBooking) {
    throw new Error("You already have an active booking request for this exact time slot.");
  }

  // 2. Server-side slot availability validation
  const dateStr = parseISO(data.scheduledStart).toISOString().split('T')[0];
  const availableSlots = await getAvailableSlots(data.licenseNumber, dateStr, type.id);
  const isSlotValid = availableSlots.some(
    slot => slot.start.toISOString() === new Date(data.scheduledStart).toISOString()
  );

  if (!isSlotValid) {
    throw new Error("This time slot is no longer available. Please select another time.");
  }

  // Fetch platform settings (maintenance mode only — commission is per-plan)
  const platformSettings = await prisma.platformSetting.findMany({
    where: { key: { in: ["maintenanceMode"] } }
  });
  const settingsMap = platformSettings.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {} as Record<string, string>);

  if (settingsMap.maintenanceMode === "true") {
    throw new Error("The platform is currently undergoing maintenance. Please try again in a few minutes.");
  }

  // 3. Payment hold verification — never trust the client-supplied PaymentIntent id.
  //    The hold must exist, be authorised (requires_capture), be for exactly this
  //    consultation's price, and carry metadata that ties it to this consultant/type.
  if (data.stripePaymentIntentId) {
    const verified = await verifyPaymentHold(data.stripePaymentIntentId, {
      expectedAmountCents: type.priceCents,
      licenseNumber: profile.licenseNumber,
      consultationTypeId: type.id,
    });
    if (!verified.ok) {
      throw new Error("Payment verification failed: " + verified.error);
    }
    const reused = await prisma.booking.findFirst({
      where: { stripePaymentIntentId: data.stripePaymentIntentId },
      select: { id: true },
    });
    if (reused) throw new Error("This payment is already attached to a booking.");
  } else if (type.priceCents > 0) {
    throw new Error("A payment authorisation is required for this consultation.");
  }

  const scheduledStart = new Date(data.scheduledStart);
  const scheduledEnd = new Date(scheduledStart.getTime() + type.durationMinutes * 60 * 1000);

  // Commission comes from the consultant's active plan subscription (Plan.commission %).
  // Falls back to 21% (Free tier) if no subscription exists.
  const consultantUserId = profile.userId ?? null;
  const commissionPercent = consultantUserId
    ? await getPlanCommission(consultantUserId)
    : 21;
  const feePercent = commissionPercent / 100;

  const booking = await prisma.booking.create({
    data: {
      consultantProfileId: profile.id,
      consultationTypeId: type.id,
      status: profile.bookingSettings?.autoConfirm ? "CONFIRMED" : "PENDING",
      scheduledStart,
      scheduledEnd,
      userFirstName: data.userFirstName,
      userLastName: data.userLastName,
      userEmail: data.userEmail,
      userPhone: data.userPhone,
      country: data.country,
      preferredLanguage: data.preferredLanguage,
      serviceNeeded: data.serviceNeeded,
      urgency: data.urgency,
      preferredCommunicationMethod: data.preferredCommunicationMethod,
      caseDescription: data.caseDescription,
      stripePaymentIntentId: data.stripePaymentIntentId || null,
      paymentStatus: data.stripePaymentIntentId ? "REQUIRES_CAPTURE" : "PENDING",
      grossAmountCents: type.priceCents,
      platformFeeCents: Math.floor(type.priceCents * feePercent), 
      netAmountCents: type.priceCents - Math.floor(type.priceCents * feePercent),
    }
  });

  await prisma.bookingEventLog.create({
    data: {
      bookingId: booking.id,
      action: "CREATED",
      actorType: "USER",
      notes: "Booking request submitted."
    }
  });

  const exactUser = await prisma.user.findUnique({ where: { email: data.userEmail } });
  await logEvent({
    userId: exactUser?.id || undefined,
    role: exactUser?.role || "CLIENT",
    action: "BOOKING_REQUESTED",
    details: { bookingId: booking.id, consultantId: profile.id }
  });

  // Phase 19: Notifications & Emails
  const consultantUser = profile.userId ? await prisma.user.findUnique({ where: { id: profile.userId }}) : null;
  
  if (consultantUser?.id) {
    await prisma.notification.create({
      data: {
        userId: consultantUser.id,
        consultantId: profile.id,
        type: "NEW_BOOKING_REQUEST",
        title: "New Booking Request",
        message: `${data.userFirstName} ${data.userLastName} requested a consultation.`,
        relatedEntityId: booking.id
      }
    });
  }

  if (consultantUser?.email) {
    await sendNewBookingEmail(consultantUser.email, data);
  }

  // Phase 21: Client Receipt Email
  await sendClientReceiptEmail(data.userEmail, {
    ...data,
    consultantName: consultantUser?.name || "Verixa Consultant",
    bookingId: booking.id
  });

  // Analytics: booking_request_submitted event
  await trackEvent({
    eventName: "booking_request_submitted",
    consultantId: profile.id,
    specialization: type.title,
    metadata: { bookingId: booking.id, typeId: type.id },
  });

  return booking;
}

export type ConsultantBookingStatus =
  | "CONFIRMED" | "DECLINED" | "COMPLETED" | "NO_SHOW"
  | "CANCELLED" | "CANCELLED_BY_CONSULTANT";

export type UpdateBookingResult =
  | { ok: true; booking: { id: string; status: string } }
  | { ok: false; error: string };

// Consultant-side transitions. CANCELLED_BY_USER is owned by cancelBookingRequest.
const ALLOWED_TRANSITIONS: Record<string, readonly string[]> = {
  PENDING: ["CONFIRMED", "DECLINED", "CANCELLED", "CANCELLED_BY_CONSULTANT"],
  CONFIRMED: ["COMPLETED", "NO_SHOW", "CANCELLED", "CANCELLED_BY_CONSULTANT"],
};

// Returns a result object (never throws for validation): Next.js hides thrown
// error messages from server actions in production, so the UI would go silent.
export async function updateBookingStatus(
  bookingId: string,
  newStatus: ConsultantBookingStatus,
  options?: {
    meetingLink?: string;
    meetingMethod?: string;
    consultantNotes?: string;
  }
): Promise<UpdateBookingResult> {
  // Security: only the owning consultant (or an admin) may change a booking.
  // Server actions are callable by anyone, so the check must live here.
  const { userId: actorId, role: actorRole } = await requireAuth();
  if (actorRole !== "CONSULTANT" && actorRole !== "ADMIN") {
    return { ok: false, error: "Only consultants can manage bookings." };
  }

  const existingBooking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { profile: { select: { userId: true, fullName: true } } },
  });
  if (!existingBooking) return { ok: false, error: "Booking not found." };

  const consultant = existingBooking.profile;

  // Admins may act on any booking (support cases include unclaimed profiles).
  if (actorRole !== "ADMIN") {
    if (!consultant.userId) {
      return { ok: false, error: "This booking belongs to an unclaimed profile." };
    }
    try {
      assertOwnership(consultant.userId, actorId, actorRole);
    } catch {
      return { ok: false, error: "You do not have permission to modify this booking." };
    }
  }

  // State machine. Same-status calls are allowed so the consultant can update
  // meeting details without a transition (no payment/email side effects then).
  const isSameStatus = existingBooking.status === newStatus;
  const allowed = ALLOWED_TRANSITIONS[existingBooking.status] ?? [];
  if (!isSameStatus && !allowed.includes(newStatus)) {
    return { ok: false, error: `A ${existingBooking.status.toLowerCase()} booking cannot be changed to ${newStatus.toLowerCase()}.` };
  }

  // Meeting link is emailed to the client: only http(s). People paste
  // "meet.google.com/abc" without a scheme, so default to https://.
  if (options?.meetingLink) {
    const raw = options.meetingLink.trim();
    const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
    let parsedLink: URL;
    try {
      parsedLink = new URL(withScheme);
    } catch {
      return { ok: false, error: "Meeting link must be a valid URL." };
    }
    if (parsedLink.protocol !== "http:" && parsedLink.protocol !== "https:") {
      return { ok: false, error: "Meeting link must start with http:// or https://." };
    }
    options.meetingLink = parsedLink.toString();
  }

  let paymentStatusUpdate = existingBooking.paymentStatus;

  // Payment side effects only on a real transition, never on a details update.
  if (!isSameStatus && existingBooking.stripePaymentIntentId && existingBooking.paymentStatus === "REQUIRES_CAPTURE") {
     if (newStatus === "CONFIRMED" || newStatus === "COMPLETED") {
         // ── Optimistic lock: atomically claim the "capturing" slot ──────────
         // If two requests arrive simultaneously, only one will see count === 1.
         // The loser gets count === 0 and throws before touching Stripe.
         const guard = await prisma.booking.updateMany({
           where: { id: bookingId, paymentStatus: "REQUIRES_CAPTURE" },
           data:  { paymentStatus: "CAPTURING" }, // provisional in-progress marker
         });
         if (guard.count === 0) {
           return { ok: false, error: "Payment capture already in progress for this booking. Please wait." };
         }

         const cap = await capturePayment(existingBooking.stripePaymentIntentId);
         if (!cap.success) {
           // Roll back the lock so a retry is possible
           await prisma.booking.update({
             where: { id: bookingId },
             data: { paymentStatus: "REQUIRES_CAPTURE" },
           });
           return { ok: false, error: "Failed to capture funds from escrow: " + cap.error };
         }
         paymentStatusUpdate = "CAPTURED";
     } else if (["DECLINED", "CANCELLED", "CANCELLED_BY_CONSULTANT"].includes(newStatus)) {
         const cancelled = await cancelPayment(existingBooking.stripePaymentIntentId);
         if (!cancelled.success) {
           return { ok: false, error: "Failed to release the payment hold: " + cancelled.error };
         }
         paymentStatusUpdate = "CANCELED";
     }
     // NO_SHOW deliberately leaves the hold untouched for the consultant to decide.
  }

  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: { 
      status: newStatus,
      ...(paymentStatusUpdate ? { paymentStatus: paymentStatusUpdate } : {}),
      ...(options?.meetingLink ? { meetingLink: options.meetingLink } : {}),
      ...(options?.meetingMethod ? { meetingMethod: options.meetingMethod } : {}),
      ...(options?.consultantNotes ? { consultantNotes: options.consultantNotes } : {})
    }
  });

  await prisma.bookingEventLog.create({
    data: {
      bookingId: booking.id,
      action: isSameStatus ? "DETAILS_UPDATED" : `STATUS_CHANGED_TO_${newStatus}`,
      actorType: actorRole === "ADMIN" ? "ADMIN" : "CONSULTANT",
      notes: isSameStatus ? "Meeting details updated via dashboard." : "Status updated via dashboard."
    }
  });

  await logEvent({
    userId: actorId,
    role: actorRole,
    action: isSameStatus ? "BOOKING_DETAILS_UPDATED" : `BOOKING_${newStatus}`,
    details: { bookingId: booking.id }
  });

  // A details-only update sends no client emails and no analytics.
  if (isSameStatus) return { ok: true, booking: { id: booking.id, status: booking.status } };

  // Notifications & emails to the client
  if (newStatus === "CONFIRMED") {
    // Alert Client
    const clientUser = await prisma.user.findUnique({ where: { email: booking.userEmail }});
    if (clientUser) {
      await prisma.notification.create({
        data: {
          userId: clientUser.id,
          type: "BOOKING_CONFIRMED",
          title: "Booking Confirmed",
          message: `Your booking with ${consultant.fullName || 'the consultant'} has been confirmed.`,
          relatedEntityId: booking.id
        }
      });
    }
    await sendBookingConfirmedEmail(booking.userEmail, booking);
  } else if (newStatus === "CANCELLED" || newStatus === "CANCELLED_BY_CONSULTANT" || newStatus === "DECLINED") {
    await sendBookingCancelledEmail(booking.userEmail, "CLIENT", booking);
  }

  // Analytics: track booking_completed when payment is captured
  if (newStatus === "CONFIRMED" || newStatus === "COMPLETED") {
    await trackEvent({
      eventName: "booking_completed",
      consultantId: booking.consultantProfileId,
      metadata: { bookingId: bookingId, newStatus },
    });
  }

  return { ok: true, booking: { id: booking.id, status: booking.status } };
}

export async function cancelBookingRequest(bookingId: string) {
  // Issue 12: centralized auth — replaces getServerSession() + manual role check
  const { userId, email } = await requireAuth();

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  
  if (!booking || booking.userEmail !== email) {
    throw new Error("Unauthorized");
  }

  if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
    throw new Error("Cannot cancel this booking");
  }

  // Void Escrow if still pending capture
  if (booking.stripePaymentIntentId && booking.paymentStatus === "REQUIRES_CAPTURE") {
    const released = await cancelPayment(booking.stripePaymentIntentId);
    if (!released.success) throw new Error("Could not release the payment hold. Please try again.");
  }

  // Issue 10 fix: Refund if payment was already captured (consultant confirmed, then client cancels)
  let refundedPaymentStatus = booking.paymentStatus;
  if (booking.stripePaymentIntentId && booking.paymentStatus === "CAPTURED") {
    const refund = await refundPayment(booking.stripePaymentIntentId);
    if (refund.success) {
      refundedPaymentStatus = "REFUNDED";
      await prisma.bookingEventLog.create({
        data: {
          bookingId: booking.id,
          action: "PAYMENT_REFUNDED",
          actorType: "SYSTEM",
          notes: `Full refund issued. Stripe refund ID: ${refund.refundId}`,
        }
      });
    } else {
      console.error(`[Refund Failed] Booking ${booking.id}:`, refund.error);
      // Don't block cancellation — log and continue. Stripe webhook will reconcile.
    }
  }

  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: { 
      status: "CANCELLED_BY_USER",
      paymentStatus: refundedPaymentStatus ?? booking.paymentStatus,
    }
  });

  await prisma.bookingEventLog.create({
    data: {
      bookingId: booking.id,
      action: "CANCELLED_BY_USER",
      actorType: "USER",
      notes: "Client cancelled the booking."
    }
  });

  // Phase 19: Alert Consultant
  const consultant = await prisma.consultantProfile.findUnique({ where: { id: booking.consultantProfileId } });
  const consultantUser = consultant?.userId ? await prisma.user.findUnique({ where: { id: consultant.userId }}) : null;
  
  if (consultantUser && consultant?.id) {
    await prisma.notification.create({
      data: {
        userId: consultantUser.id,
        consultantId: consultant.id,
        type: "BOOKING_CANCELLED",
        title: "Booking Cancelled by Client",
        message: `${booking.userFirstName} ${booking.userLastName} has cancelled their request.`,
        relatedEntityId: booking.id
      }
    });

    if (consultantUser.email) {
      await sendBookingCancelledEmail(consultantUser.email, "CONSULTANT", booking);
    }
  }

  return updatedBooking;
}

// Both go through updateBookingStatus so ownership, the CONFIRMED-only
// transition rule, and escrow capture (for COMPLETED) are enforced in one place.
export async function markBookingNoShow(bookingId: string): Promise<UpdateBookingResult> {
  return updateBookingStatus(bookingId, "NO_SHOW");
}

export async function markBookingCompleted(bookingId: string): Promise<UpdateBookingResult> {
  return updateBookingStatus(bookingId, "COMPLETED");
}

export async function updateBookingSettings(data: {
  bufferMinutes?: number;
  minimumNoticeHours?: number;
  maxBookingsPerDay?: number | null;
  bookingWindowDays?: number | null;
  autoConfirm?: boolean;
  defaultMeetingMethod?: string | null;
  defaultMeetingProvider?: string | null;
  defaultMeetingLink?: string | null;
  defaultMeetingInstructions?: string | null;
}) {
  // Issue 12: Replaces manual session + findUnique(user) pattern
  const { userId } = await requireConsultant();

  const profile = await prisma.consultantProfile.findUnique({
    where: { userId }
  });

  if (!profile) throw new Error("Consultant profile not found");

  const updatedSettings = await prisma.bookingSettings.upsert({
    where: { consultantProfileId: profile.id },
    create: {
      consultantProfileId: profile.id,
      ...data
    },
    update: {
      ...data
    }
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/consultant/[slug]", "page");
  return { success: true, settings: updatedSettings };
}
