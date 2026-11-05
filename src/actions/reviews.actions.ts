"use server";

import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";
import { logEvent } from "@/lib/logger";
import { trackEvent } from "./analytics.actions";
import { bookingReviewSchema, canReviewBooking, GUEST_REVIEW_LIMITS, guestReviewSchema, replySchema } from "@/lib/review-rules";

export type ReviewResult = { ok: true; status: string } | { ok: false; error: string };

// Verified review: tied to a completed booking owned by the signed-in client.
// The consultant comes from the booking, never from the caller.
export async function submitReview(input: { bookingId: string; consultantProfileId?: string; rating: number; comment?: string }): Promise<ReviewResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) return { ok: false, error: "Please sign in to leave a review." };

  const parsed = bookingReviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message || "Invalid review." };
  const data = parsed.data;

  const booking = await prisma.booking.findUnique({
    where: { id: data.bookingId },
    select: { id: true, status: true, userEmail: true, scheduledEnd: true, consultantProfileId: true, profile: { select: { licenseNumber: true } } },
  });
  const existing = booking ? await prisma.review.findUnique({ where: { bookingId: booking.id }, select: { id: true } }) : null;
  const check = canReviewBooking(booking, session.user.email, !!existing);
  if (!check.ok || !booking) return check.ok ? { ok: false, error: "Booking not found." } : check;

  try {
    await prisma.review.create({
      data: {
        userId: session.user.id,
        consultantProfileId: booking.consultantProfileId,
        bookingId: booking.id,
        rating: data.rating,
        comment: data.comment || null,
        status: "PUBLISHED",
      },
    });
  } catch (e) {
    if ((e as { code?: string })?.code === "P2002") return { ok: false, error: "You've already reviewed this consultation." };
    console.error("[submitReview] failed:", e);
    return { ok: false, error: "Could not save your review. Please try again." };
  }

  revalidatePath("/dashboard/client/reviews");
  revalidatePath(`/consultant/${booking.profile.licenseNumber}`);

  await logEvent({
    userId: session.user.id,
    role: session.user.role,
    action: "REVIEW_SUBMITTED",
    details: { bookingId: booking.id, consultantProfileId: booking.consultantProfileId, rating: data.rating },
  });
  await trackEvent({ eventName: "review_submitted", consultantId: booking.consultantProfileId, metadata: { rating: data.rating } });

  return { ok: true, status: "PUBLISHED" };
}

// Guest review: no booking behind it, so it is held for moderation and shown
// as unverified once approved. One per email per consultant, a few per IP a day.
export async function submitGuestReview(input: {
  licenseNumber: string;
  guestName: string;
  guestEmail: string;
  rating: number;
  comment?: string;
}): Promise<ReviewResult> {
  const parsed = guestReviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message || "Invalid review." };
  const data = parsed.data;

  const profile = await prisma.consultantProfile.findUnique({
    where: { licenseNumber: data.licenseNumber.toUpperCase() },
    select: { id: true, licenseNumber: true, userId: true },
  });
  if (!profile) return { ok: false, error: "Consultant not found." };

  const headersList = await headers();
  const ip = (headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown").split(",")[0].trim();
  const userAgent = (headersList.get("user-agent") || "unknown").slice(0, 300);

  // Consultants can't review themselves.
  const session = await getServerSession(authOptions);
  if (session?.user?.id && session.user.id === profile.userId) {
    return { ok: false, error: "You can't review your own profile." };
  }

  const sameEmail = await prisma.review.count({
    where: { consultantProfileId: profile.id, guestEmail: data.guestEmail },
  });
  if (sameEmail >= GUEST_REVIEW_LIMITS.perEmailPerProfile) {
    return { ok: false, error: "You've already submitted a review for this consultant." };
  }
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const fromIp = await prisma.review.count({
    where: { createdAt: { gte: since }, userId: null, metadata: { path: ["ip"], equals: ip } },
  });
  if (ip !== "unknown" && fromIp >= GUEST_REVIEW_LIMITS.perIpPerDay) {
    return { ok: false, error: "Too many reviews from this network today. Please try again tomorrow." };
  }

  await prisma.review.create({
    data: {
      consultantProfileId: profile.id,
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      rating: data.rating,
      comment: data.comment || null,
      status: "PENDING_MODERATION",
      metadata: { ip, userAgent, timestamp: new Date().toISOString() },
    },
  });

  await trackEvent({ eventName: "guest_review_submitted", consultantId: profile.id, metadata: { rating: data.rating } });
  return { ok: true, status: "PENDING_MODERATION" };
}

export async function replyToReview(reviewId: string, replyText: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "CONSULTANT") return { ok: false, error: "Only the consultant can reply." };

  const parsed = replySchema.safeParse(replyText ?? "");
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message || "Invalid reply." };

  const consultantProfile = await prisma.consultantProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, licenseNumber: true },
  });
  if (!consultantProfile) return { ok: false, error: "Profile not found." };

  const res = await prisma.review.updateMany({
    where: { id: reviewId, consultantProfileId: consultantProfile.id },
    data: { replyText: parsed.data || null, repliedAt: parsed.data ? new Date() : null },
  });
  if (res.count === 0) return { ok: false, error: "Review not found." };

  revalidatePath("/dashboard/reviews");
  revalidatePath(`/consultant/${consultantProfile.licenseNumber}`);
  return { ok: true };
}
