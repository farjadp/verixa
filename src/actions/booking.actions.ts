"use server";

import { prisma } from "@/lib/prisma";
import { generateAvailableSlots } from "@/lib/booking-utils";
import { startOfDay, endOfDay, parseISO } from "date-fns";
import { getConsultantByLicense } from "@/lib/db";
import { logEvent } from "@/lib/logger";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { revalidatePath } from "next/cache";
import { 
  sendNewBookingEmail, 
  sendBookingCancelledEmail, 
  sendBookingConfirmedEmail, 
  sendClientReceiptEmail
} from "@/lib/mailer";
import { capturePaymentAction, cancelPaymentAction } from "@/actions/stripe.actions";

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
    const scraperData = getConsultantByLicense(licenseNumber.toUpperCase());
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
  scheduledEnd: string; // ISO string
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

  const booking = await prisma.booking.create({
    data: {
      consultantProfileId: profile.id,
      consultationTypeId: type.id,
      status: profile.bookingSettings?.autoConfirm ? "CONFIRMED" : "PENDING",
      scheduledStart: new Date(data.scheduledStart),
      scheduledEnd: new Date(data.scheduledEnd),
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
      platformFeeCents: Math.floor(type.priceCents * 0.21), // MVP default 21%
      netAmountCents: Math.floor(type.priceCents * 0.79),
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

  return booking;
}

export async function updateBookingStatus(
  bookingId: string,
  newStatus: "CONFIRMED" | "DECLINED" | "COMPLETED" | "CANCELLED" | "CANCELLED_BY_CONSULTANT" | "CANCELLED_BY_USER",
  options?: {
    meetingLink?: string;
    meetingMethod?: string;
    consultantNotes?: string;
  }
) {
  const existingBooking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!existingBooking) throw new Error("Booking not found");

  let paymentStatusUpdate = existingBooking.paymentStatus;
  
  if (existingBooking.stripePaymentIntentId && existingBooking.paymentStatus === "REQUIRES_CAPTURE") {
     if (newStatus === "CONFIRMED") {
         const cap = await capturePaymentAction(existingBooking.stripePaymentIntentId);
         if (!cap.success) throw new Error("Failed to capture funds from Escrow: " + cap.error);
         paymentStatusUpdate = "CAPTURED";
     } else if (["DECLINED", "CANCELLED", "CANCELLED_BY_CONSULTANT", "CANCELLED_BY_USER"].includes(newStatus)) {
         await cancelPaymentAction(existingBooking.stripePaymentIntentId);
         paymentStatusUpdate = "CANCELED";
     }
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
      action: `STATUS_CHANGED_TO_${newStatus}`,
      actorType: "CONSULTANT",
      notes: "Status updated via dashboard."
    }
  });

  const consultant = await prisma.consultantProfile.findUnique({ where: { id: booking.consultantProfileId }});
  await logEvent({
    userId: consultant?.userId || undefined,
    role: "CONSULTANT",
    action: `BOOKING_${newStatus}`,
    details: { bookingId: booking.id }
  });

  // Phase 19: Notifications & Emails (To Client)
  if (newStatus === "CONFIRMED") {
    // Alert Client
    const clientUser = await prisma.user.findUnique({ where: { email: booking.userEmail }});
    if (clientUser) {
      await prisma.notification.create({
        data: {
          userId: clientUser.id,
          type: "BOOKING_CONFIRMED",
          title: "Booking Confirmed",
          message: `Your booking with ${consultant?.fullName || 'the consultant'} has been confirmed.`,
          relatedEntityId: booking.id
        }
      });
    }
    await sendBookingConfirmedEmail(booking.userEmail, booking);
  } else if (newStatus === "CANCELLED" || newStatus === "CANCELLED_BY_CONSULTANT" || newStatus === "DECLINED") {
    await sendBookingCancelledEmail(booking.userEmail, "CLIENT", booking);
  }

  return booking;
}

export async function cancelBookingRequest(bookingId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  
  if (!booking || booking.userEmail !== session.user.email) {
    throw new Error("Unauthorized");
  }

  if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
    throw new Error("Cannot cancel this booking");
  }

  // Void Escrow if still pending capture
  if (booking.stripePaymentIntentId && booking.paymentStatus === "REQUIRES_CAPTURE") {
    await cancelPaymentAction(booking.stripePaymentIntentId);
  }

  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: { 
      status: "CANCELLED_BY_USER",
      ...(booking.paymentStatus === "REQUIRES_CAPTURE" && { paymentStatus: "CANCELED" })
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

export async function markBookingNoShow(bookingId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "NO_SHOW" } // Enum field
  });

  await prisma.bookingEventLog.create({
    data: {
      bookingId: booking.id,
      action: "MARKED_NO_SHOW",
      actorType: "CONSULTANT",
      notes: "Consultant marked client as no-show."
    }
  });

  return booking;
}

export async function markBookingCompleted(bookingId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "COMPLETED" } 
  });

  await prisma.bookingEventLog.create({
    data: {
      bookingId: booking.id,
      action: "MARKED_COMPLETED",
      actorType: "CONSULTANT",
      notes: "Consultant completed the session."
    }
  });

  return booking;
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
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) throw new Error("Unauthorized");

  const profile = await prisma.consultantProfile.findUnique({
    where: { userId: user.id }
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
