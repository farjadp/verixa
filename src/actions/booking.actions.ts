"use server";

import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";
import { generateAvailableSlots } from "@/lib/booking-utils";
import { logEvent } from "@/lib/logger";
import { requireAuth, requireConsultant, assertOwnership } from "@/lib/permissions";
import {
  sendNewBookingEmail,
  sendBookingCancelledEmail,
  sendBookingConfirmedEmail,
  sendClientReceiptEmail,
} from "@/lib/mailer";
import { capturePayment, cancelPayment, refundPayment, verifyPaymentHold } from "@/lib/stripe-payments";
import { trackEvent } from "@/actions/analytics.actions";
import { getPlanCommission } from "@/lib/subscription";
import {
  canAcceptBookings,
  normalizeEmail,
  planClientCancellation,
  planConsultantTransition,
  type ConsultantTargetStatus,
  type PaymentAction,
} from "@/lib/booking-rules";
import { dayOfWeekForDate, parseDateString, safeTimeZone, zonedDayBounds, dateStringInTimeZone } from "@/lib/timezone";

// ─── Read: booking configuration ────────────────────────────────────────────

async function loadBookingProfile(licenseNumber: string) {
  return prisma.consultantProfile.findUnique({
    where: { licenseNumber: licenseNumber.trim().toUpperCase() },
    include: {
      consultationTypes: { where: { isActive: true }, orderBy: { priceCents: "asc" } },
      weeklyAvailability: { where: { isActive: true } },
      bookingSettings: true,
    },
  });
}

/**
 * Public booking configuration for the booking page. Returns only fields that
 * are safe to send to the browser (no registry email/phone, no user id).
 * Never creates rows: unclaimed profiles are not bookable.
 */
export async function getConsultantBookingConfig(licenseNumber: string) {
  const profile = await loadBookingProfile(licenseNumber);
  if (!profile) return null;

  const gate = canAcceptBookings(profile);
  return {
    id: profile.id,
    licenseNumber: profile.licenseNumber,
    fullName: profile.fullName,
    company: profile.company,
    province: profile.province,
    avatarImage: profile.avatarImage,
    verificationLevel: profile.userId ? profile.verificationLevel : null,
    isClaimed: !!profile.userId,
    timezone: safeTimeZone(profile.timezone),
    bookable: gate.ok && profile.consultationTypes.length > 0 && profile.weeklyAvailability.length > 0,
    notBookableReason: !gate.ok
      ? gate.error
      : profile.consultationTypes.length === 0
        ? "This consultant has not published any consultation types yet."
        : profile.weeklyAvailability.length === 0
          ? "This consultant has not set their availability yet."
          : null,
    bookingWindowDays: profile.bookingSettings?.bookingWindowDays ?? 60,
    autoConfirm: profile.bookingSettings?.autoConfirm ?? false,
    consultationTypes: profile.consultationTypes.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      durationMinutes: t.durationMinutes,
      priceCents: t.priceCents,
      communicationType: t.communicationType,
    })),
  };
}

export type PublicBookingConfig = NonNullable<Awaited<ReturnType<typeof getConsultantBookingConfig>>>;

async function computeSlots(
  profile: NonNullable<Awaited<ReturnType<typeof loadBookingProfile>>>,
  dateStr: string,
  durationMinutes: number,
  db: Prisma.TransactionClient | typeof prisma = prisma
) {
  const settings = profile.bookingSettings;
  const timeZone = safeTimeZone(profile.timezone);
  const dayOfWeek = dayOfWeekForDate(dateStr);
  const dayAvailability = profile.weeklyAvailability.find((a) => a.dayOfWeek === dayOfWeek) ?? null;
  const { start, end } = zonedDayBounds(dateStr, timeZone);

  // Include the buffer either side so a booking just before midnight still blocks.
  const pad = (settings?.bufferMinutes ?? 15) * 60 * 1000;
  const existingBookings = await db.booking.findMany({
    where: {
      consultantProfileId: profile.id,
      status: { in: ["PENDING", "CONFIRMED"] },
      scheduledStart: { lt: new Date(end.getTime() + pad) },
      scheduledEnd: { gt: new Date(start.getTime() - pad) },
    },
    select: { scheduledStart: true, scheduledEnd: true },
  });
  const sameDay = existingBookings.filter((b) => b.scheduledStart >= start && b.scheduledStart < end);

  return generateAvailableSlots({
    dateStr,
    timeZone,
    durationMinutes,
    bufferMinutes: settings?.bufferMinutes ?? 15,
    minimumNoticeHours: settings?.minimumNoticeHours ?? 24,
    dayAvailability: dayAvailability ? { startTime: dayAvailability.startTime, endTime: dayAvailability.endTime } : null,
    existingBookings,
    maxBookingsPerDay: settings?.maxBookingsPerDay ?? null,
    bookingsOnDay: sameDay.length,
    bookingWindowDays: settings?.bookingWindowDays ?? 60,
  });
}

/** dateStr is a calendar date (YYYY-MM-DD) interpreted in the consultant's timezone. */
export async function getAvailableSlots(licenseNumber: string, dateStr: string, consultationTypeId: string) {
  if (!parseDateString(dateStr)) return [];
  const profile = await loadBookingProfile(licenseNumber);
  if (!profile || !canAcceptBookings(profile).ok) return [];
  const type = profile.consultationTypes.find((t) => t.id === consultationTypeId);
  if (!type) return [];
  return computeSlots(profile, dateStr, type.durationMinutes);
}

// ─── Create ─────────────────────────────────────────────────────────────────

const bookingInputSchema = z.object({
  licenseNumber: z.string().trim().min(1).max(32),
  consultationTypeId: z.string().trim().min(1).max(64),
  scheduledStart: z.string().datetime({ offset: true }),
  scheduledEnd: z.string().optional(), // ignored: derived from the consultation duration
  userFirstName: z.string().trim().min(1, "First name is required").max(100),
  userLastName: z.string().trim().min(1, "Last name is required").max(100),
  userEmail: z.string().trim().toLowerCase().email("Enter a valid email address").max(200),
  userPhone: z.string().trim().max(40).optional(),
  country: z.string().trim().max(100).optional(),
  preferredLanguage: z.string().trim().max(60).optional(),
  serviceNeeded: z.string().trim().max(200).optional(),
  urgency: z.string().trim().max(40).optional(),
  preferredCommunicationMethod: z.string().trim().max(40).optional(),
  caseDescription: z.string().trim().max(5000).optional(),
  stripePaymentIntentId: z.string().trim().max(255).optional(),
});

export type CreateBookingInput = z.input<typeof bookingInputSchema>;
export type CreateBookingResult =
  | { ok: true; bookingId: string; status: string; isGuest: boolean }
  | { ok: false; error: string };

class BookingError extends Error {}

// Returns a result object: Next.js hides thrown messages from server actions in
// production. Any failure after the card was authorised releases the hold so
// the client is never left with money frozen against a booking that doesn't exist.
export async function createBookingRequest(input: CreateBookingInput): Promise<CreateBookingResult> {
  const parsed = bookingInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || "Invalid booking details." };
  }
  const data = parsed.data;
  const session = await getServerSession(authOptions);
  // A signed-in client always books as themselves; the form email is only for guests.
  const userEmail = session?.user?.email ? normalizeEmail(session.user.email) : data.userEmail;
  const piId = data.stripePaymentIntentId || null;

  const releaseHold = async () => {
    if (!piId) return;
    const released = await cancelPayment(piId);
    if (!released.success) console.error(`[createBookingRequest] could not release hold ${piId}:`, released.error);
  };

  try {
    const profile = await loadBookingProfile(data.licenseNumber);
    if (!profile) throw new BookingError("Consultant not found.");
    const gate = canAcceptBookings(profile);
    if (!gate.ok) throw new BookingError(gate.error);

    const type = profile.consultationTypes.find((t) => t.id === data.consultationTypeId);
    if (!type) throw new BookingError("This consultation type is no longer offered.");

    const maintenance = await prisma.platformSetting.findUnique({ where: { key: "maintenanceMode" } });
    if (maintenance?.value === "true") {
      throw new BookingError("The platform is undergoing maintenance. Please try again in a few minutes.");
    }

    // Payment hold: never trust the client-supplied PaymentIntent id.
    if (piId) {
      const verified = await verifyPaymentHold(piId, {
        expectedAmountCents: type.priceCents,
        licenseNumber: profile.licenseNumber,
        consultationTypeId: type.id,
      });
      if (!verified.ok) throw new BookingError("Payment verification failed: " + verified.error);
      const reused = await prisma.booking.findFirst({ where: { stripePaymentIntentId: piId }, select: { id: true } });
      // Reused hold belongs to an existing booking: do NOT release it.
      if (reused) return { ok: false, error: "This payment is already attached to a booking." };
    } else if (type.priceCents > 0) {
      throw new BookingError("A payment authorisation is required for this consultation.");
    }

    const scheduledStart = new Date(data.scheduledStart);
    const scheduledEnd = new Date(scheduledStart.getTime() + type.durationMinutes * 60 * 1000);
    const timeZone = safeTimeZone(profile.timezone);
    const dateStr = dateStringInTimeZone(scheduledStart, timeZone);

    const commissionPercent = profile.userId ? await getPlanCommission(profile.userId) : 21;
    const platformFeeCents = Math.floor((type.priceCents * commissionPercent) / 100);
    const autoConfirm = profile.bookingSettings?.autoConfirm ?? false;

    // Slot check + insert in one serializable transaction so two clients can't
    // take the same slot at the same moment.
    const booking = await prisma.$transaction(
      async (tx) => {
        const slots = await computeSlots(profile, dateStr, type.durationMinutes, tx);
        if (!slots.some((s) => s.start.getTime() === scheduledStart.getTime())) {
          throw new BookingError("This time slot is no longer available. Please pick another time.");
        }
        const duplicate = await tx.booking.findFirst({
          where: {
            consultantProfileId: profile.id,
            userEmail,
            status: { in: ["PENDING", "CONFIRMED"] },
            scheduledStart,
          },
          select: { id: true },
        });
        if (duplicate) throw new BookingError("You already have a booking request for this time.");

        return tx.booking.create({
          data: {
            consultantProfileId: profile.id,
            consultationTypeId: type.id,
            status: "PENDING", // auto-confirm is applied below, after the capture succeeds
            scheduledStart,
            scheduledEnd,
            userFirstName: data.userFirstName,
            userLastName: data.userLastName,
            userEmail,
            userPhone: data.userPhone,
            country: data.country,
            preferredLanguage: data.preferredLanguage,
            serviceNeeded: data.serviceNeeded,
            urgency: data.urgency,
            preferredCommunicationMethod: data.preferredCommunicationMethod,
            caseDescription: data.caseDescription,
            meetingMethod: type.communicationType,
            stripePaymentIntentId: piId,
            paymentStatus: piId ? "REQUIRES_CAPTURE" : "PENDING",
            grossAmountCents: type.priceCents,
            platformFeeCents,
            netAmountCents: type.priceCents - platformFeeCents,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    await prisma.bookingEventLog.create({
      // GUEST = the email was typed, not proven by a session. The client dossier
      // is only shown to consultants for signed-in (USER) bookings.
      data: { bookingId: booking.id, action: "CREATED", actorType: session?.user ? "USER" : "GUEST", notes: "Booking request submitted." },
    });

    // Auto-confirm: capture now, so a CONFIRMED booking always has captured funds
    // and the 7-day authorisation window can't lapse before the session.
    let finalStatus = booking.status;
    if (autoConfirm) {
      let captured = !piId;
      if (piId) {
        const cap = await capturePayment(piId);
        captured = cap.success;
        if (!cap.success) console.error(`[createBookingRequest] auto-confirm capture failed for ${booking.id}:`, cap.error);
      }
      if (captured) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: { status: "CONFIRMED", ...(piId ? { paymentStatus: "CAPTURED" } : {}) },
        });
        await prisma.bookingEventLog.create({
          data: { bookingId: booking.id, action: "AUTO_CONFIRMED", actorType: "SYSTEM", notes: "Confirmed automatically by the consultant's booking settings." },
        });
        finalStatus = "CONFIRMED";
      }
    }

    // Side effects below must not undo a booking that now exists.
    try {
      const exactUser = await prisma.user.findUnique({ where: { email: userEmail } });
      await logEvent({
        userId: exactUser?.id || undefined,
        role: exactUser?.role || "CLIENT",
        action: "BOOKING_REQUESTED",
        details: { bookingId: booking.id, consultantId: profile.id },
      });

      const consultantUser = profile.userId ? await prisma.user.findUnique({ where: { id: profile.userId } }) : null;
      const emailData = { ...data, userEmail, scheduledStart: scheduledStart.toISOString(), timeZone, consultationTitle: type.title };
      if (consultantUser) {
        await prisma.notification.create({
          data: {
            userId: consultantUser.id,
            consultantId: profile.id,
            type: "NEW_BOOKING_REQUEST",
            title: finalStatus === "CONFIRMED" ? "New Booking (auto-confirmed)" : "New Booking Request",
            message: `${data.userFirstName} ${data.userLastName} ${finalStatus === "CONFIRMED" ? "booked" : "requested"} ${type.title}.`,
            relatedEntityId: booking.id,
          },
        });
        if (consultantUser.email) await sendNewBookingEmail(consultantUser.email, emailData);
      }
      await sendClientReceiptEmail(userEmail, { ...emailData, consultantName: profile.fullName, bookingId: booking.id });
      await trackEvent({
        eventName: "booking_request_submitted",
        consultantId: profile.id,
        specialization: type.title,
        metadata: { bookingId: booking.id, typeId: type.id },
      });
    } catch (sideEffectError) {
      console.error("[createBookingRequest] notification side effect failed:", sideEffectError);
    }

    revalidatePath("/dashboard/booking");
    return { ok: true, bookingId: booking.id, status: finalStatus, isGuest: !session?.user };
  } catch (e) {
    await releaseHold();
    if (e instanceof BookingError) return { ok: false, error: e.message };
    if (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === "P2034" || e.code === "P2002")) {
      return { ok: false, error: "This time slot was just taken. Please pick another time." };
    }
    console.error("[createBookingRequest] failed:", e);
    return { ok: false, error: "We couldn't create your booking. Your card hold has been released. Please try again." };
  }
}

// ─── Consultant-side status changes ─────────────────────────────────────────

export type ConsultantBookingStatus = ConsultantTargetStatus;

export type UpdateBookingResult =
  | { ok: true; booking: { id: string; status: string } }
  | { ok: false; error: string };

async function applyPayment(action: PaymentAction, piId: string | null): Promise<{ ok: true; status?: string } | { ok: false; error: string }> {
  if (action === "none" || !piId) return { ok: true };
  if (action === "capture") {
    const cap = await capturePayment(piId);
    return cap.success ? { ok: true, status: "CAPTURED" } : { ok: false, error: "Failed to capture funds from escrow: " + cap.error };
  }
  if (action === "release") {
    const rel = await cancelPayment(piId);
    return rel.success ? { ok: true, status: "CANCELED" } : { ok: false, error: "Failed to release the payment hold: " + rel.error };
  }
  const ref = await refundPayment(piId);
  return ref.success ? { ok: true, status: "REFUNDED" } : { ok: false, error: "Failed to refund the client: " + ref.error };
}

// Returns a result object (never throws for validation): Next.js hides thrown
// error messages from server actions in production, so the UI would go silent.
export async function updateBookingStatus(
  bookingId: string,
  newStatus: ConsultantBookingStatus,
  options?: { meetingLink?: string; meetingMethod?: string; consultantNotes?: string }
): Promise<UpdateBookingResult> {
  let actorId: string;
  let actorRole: string;
  try {
    ({ userId: actorId, role: actorRole } = await requireAuth());
  } catch {
    return { ok: false, error: "Please sign in again." };
  }
  if (actorRole !== "CONSULTANT" && actorRole !== "ADMIN") {
    return { ok: false, error: "Only consultants can manage bookings." };
  }

  const existingBooking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      profile: { select: { userId: true, fullName: true, timezone: true } },
      type: { select: { priceCents: true, title: true } },
    },
  });
  if (!existingBooking) return { ok: false, error: "Booking not found." };
  const consultant = existingBooking.profile;

  // Admins may act on any booking (support cases include unclaimed profiles).
  if (actorRole !== "ADMIN") {
    if (!consultant.userId) return { ok: false, error: "This booking belongs to an unclaimed profile." };
    try {
      assertOwnership(consultant.userId, actorId, actorRole);
    } catch {
      return { ok: false, error: "You do not have permission to modify this booking." };
    }
  }

  const plan = planConsultantTransition({
    from: existingBooking.status,
    to: newStatus,
    scheduledStart: existingBooking.scheduledStart,
    now: new Date(),
    hasPaymentIntent: !!existingBooking.stripePaymentIntentId,
    paymentStatus: existingBooking.paymentStatus,
    priceCents: existingBooking.grossAmountCents || existingBooking.type.priceCents,
  });
  if (!plan.ok) return plan;

  // Meeting link is emailed to the client: only http(s). People paste
  // "meet.google.com/abc" without a scheme, so default to https://.
  let meetingLink: string | undefined;
  if (options?.meetingLink?.trim()) {
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
    meetingLink = parsedLink.toString();
  }
  const consultantNotes = options?.consultantNotes?.slice(0, 5000);
  const meetingMethod = options?.meetingMethod?.slice(0, 40);

  let paymentStatusUpdate = existingBooking.paymentStatus;
  const piId = existingBooking.stripePaymentIntentId;

  if (plan.payment !== "none" && piId) {
    // Optimistic lock: only one request may move money for this booking.
    const lockFrom = existingBooking.paymentStatus ?? "PENDING";
    const guard = await prisma.booking.updateMany({
      where: { id: bookingId, paymentStatus: lockFrom, status: existingBooking.status },
      data: { paymentStatus: "PROCESSING" },
    });
    if (guard.count === 0) {
      return { ok: false, error: "This booking was just updated. Refresh the page and try again." };
    }
    const result = await applyPayment(plan.payment, piId);
    if (!result.ok) {
      await prisma.booking.update({ where: { id: bookingId }, data: { paymentStatus: lockFrom } });
      return { ok: false, error: result.error };
    }
    paymentStatusUpdate = result.status ?? lockFrom;
  }

  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: newStatus,
      paymentStatus: paymentStatusUpdate,
      ...(meetingLink ? { meetingLink } : {}),
      ...(meetingMethod ? { meetingMethod } : {}),
      ...(consultantNotes ? { consultantNotes } : {}),
    },
  });

  await prisma.bookingEventLog.create({
    data: {
      bookingId: booking.id,
      action: plan.sameStatus ? "DETAILS_UPDATED" : `STATUS_CHANGED_TO_${newStatus}`,
      actorType: actorRole === "ADMIN" ? "ADMIN" : "CONSULTANT",
      notes: plan.sameStatus
        ? "Meeting details updated via dashboard."
        : `Status updated via dashboard.${plan.payment !== "none" ? ` Payment: ${plan.payment}.` : ""}`,
    },
  });

  await logEvent({
    userId: actorId,
    role: actorRole,
    action: plan.sameStatus ? "BOOKING_DETAILS_UPDATED" : `BOOKING_${newStatus}`,
    details: { bookingId: booking.id },
  });

  revalidatePath(`/dashboard/booking/${booking.id}`);
  revalidatePath("/dashboard/booking");
  if (plan.sameStatus) return { ok: true, booking: { id: booking.id, status: booking.status } };

  const emailData = { ...booking, timeZone: safeTimeZone(consultant.timezone), consultantName: consultant.fullName };
  try {
    if (newStatus === "CONFIRMED") {
      const clientUser = await prisma.user.findUnique({ where: { email: booking.userEmail } });
      if (clientUser) {
        await prisma.notification.create({
          data: {
            userId: clientUser.id,
            type: "BOOKING_CONFIRMED",
            title: "Booking Confirmed",
            message: `Your booking with ${consultant.fullName || "the consultant"} has been confirmed.`,
            relatedEntityId: booking.id,
          },
        });
      }
      await sendBookingConfirmedEmail(booking.userEmail, emailData);
    } else if (newStatus === "CANCELLED" || newStatus === "CANCELLED_BY_CONSULTANT" || newStatus === "DECLINED") {
      await sendBookingCancelledEmail(booking.userEmail, "CLIENT", emailData);
    }

    if (newStatus === "CONFIRMED" || newStatus === "COMPLETED") {
      await trackEvent({
        eventName: "booking_completed",
        consultantId: booking.consultantProfileId,
        metadata: { bookingId, newStatus },
      });
    }
  } catch (sideEffectError) {
    console.error("[updateBookingStatus] notification side effect failed:", sideEffectError);
  }

  return { ok: true, booking: { id: booking.id, status: booking.status } };
}

export type CancelBookingResult = { ok: true } | { ok: false; error: string };

export async function cancelBookingRequest(bookingId: string): Promise<CancelBookingResult> {
  let email: string | null | undefined;
  try {
    ({ email } = await requireAuth());
  } catch {
    return { ok: false, error: "Please sign in again." };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { profile: { select: { id: true, userId: true, timezone: true, fullName: true } } },
  });
  if (!booking || normalizeEmail(booking.userEmail) !== normalizeEmail(email)) {
    return { ok: false, error: "Booking not found." };
  }

  const plan = planClientCancellation({
    status: booking.status,
    scheduledStart: booking.scheduledStart,
    now: new Date(),
    hasPaymentIntent: !!booking.stripePaymentIntentId,
    paymentStatus: booking.paymentStatus,
  });
  if (!plan.ok) return plan;

  // Lock the row so a consultant confirm/capture can't race the cancellation.
  const lockFrom = booking.paymentStatus ?? "PENDING";
  const guard = await prisma.booking.updateMany({
    where: { id: bookingId, status: booking.status, paymentStatus: lockFrom },
    data: { paymentStatus: "PROCESSING" },
  });
  if (guard.count === 0) return { ok: false, error: "This booking was just updated. Refresh and try again." };

  const payment = await applyPayment(plan.payment, booking.stripePaymentIntentId);
  if (!payment.ok) {
    await prisma.booking.update({ where: { id: bookingId }, data: { paymentStatus: lockFrom } });
    return { ok: false, error: "We couldn't return your payment, so the booking was not cancelled. Please try again or contact support." };
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED_BY_USER", paymentStatus: payment.status ?? lockFrom },
  });

  await prisma.bookingEventLog.create({
    data: {
      bookingId: booking.id,
      action: "CANCELLED_BY_USER",
      actorType: "USER",
      notes: `Client cancelled the booking.${plan.payment !== "none" ? ` Payment: ${plan.payment}.` : ""}`,
    },
  });

  try {
    const consultantUser = booking.profile.userId
      ? await prisma.user.findUnique({ where: { id: booking.profile.userId } })
      : null;
    if (consultantUser) {
      await prisma.notification.create({
        data: {
          userId: consultantUser.id,
          consultantId: booking.profile.id,
          type: "BOOKING_CANCELLED",
          title: "Booking Cancelled by Client",
          message: `${booking.userFirstName} ${booking.userLastName} has cancelled their booking.`,
          relatedEntityId: booking.id,
        },
      });
      if (consultantUser.email) {
        await sendBookingCancelledEmail(consultantUser.email, "CONSULTANT", {
          ...booking,
          timeZone: safeTimeZone(booking.profile.timezone),
        });
      }
    }
  } catch (sideEffectError) {
    console.error("[cancelBookingRequest] notification side effect failed:", sideEffectError);
  }

  revalidatePath("/dashboard/client/bookings");
  revalidatePath(`/dashboard/client/bookings/${bookingId}`);
  return { ok: true };
}

// Both go through updateBookingStatus so ownership, the after-start rule and
// escrow capture are enforced in one place.
export async function markBookingNoShow(bookingId: string): Promise<UpdateBookingResult> {
  return updateBookingStatus(bookingId, "NO_SHOW");
}

export async function markBookingCompleted(bookingId: string): Promise<UpdateBookingResult> {
  return updateBookingStatus(bookingId, "COMPLETED");
}

const bookingSettingsSchema = z.object({
  bufferMinutes: z.number().int().min(0).max(240).optional(),
  minimumNoticeHours: z.number().int().min(0).max(24 * 60).optional(),
  maxBookingsPerDay: z.number().int().min(1).max(50).nullable().optional(),
  bookingWindowDays: z.number().int().min(1).max(365).nullable().optional(),
  autoConfirm: z.boolean().optional(),
  defaultMeetingMethod: z.string().max(40).nullable().optional(),
  defaultMeetingProvider: z.string().max(40).nullable().optional(),
  defaultMeetingLink: z.string().max(500).nullable().optional(),
  defaultMeetingInstructions: z.string().max(2000).nullable().optional(),
});

export async function updateBookingSettings(input: z.input<typeof bookingSettingsSchema>) {
  const { userId } = await requireConsultant();
  const parsed = bookingSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message || "Invalid settings." };
  }
  const data = parsed.data;

  const profile = await prisma.consultantProfile.findUnique({ where: { userId }, select: { id: true, licenseNumber: true } });
  if (!profile) return { success: false as const, error: "Consultant profile not found." };

  const updatedSettings = await prisma.bookingSettings.upsert({
    where: { consultantProfileId: profile.id },
    create: { consultantProfileId: profile.id, ...data },
    update: data,
  });

  revalidatePath("/dashboard/settings");
  revalidatePath(`/consultant/${profile.licenseNumber}`);
  return { success: true as const, settings: updatedSettings };
}
