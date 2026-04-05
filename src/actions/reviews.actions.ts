"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { revalidatePath } from "next/cache";
import { logEvent } from "@/lib/logger";
import { trackEvent } from "./analytics.actions";

export async function submitReview(data: {
  bookingId: string;
  consultantProfileId: string;
  rating: number;
  comment?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    throw new Error("Must be logged in to submit a review");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!user) throw new Error("User not found");

  // Verify the booking belongs to this user and is completed
  const booking = await prisma.booking.findUnique({
    where: { id: data.bookingId }
  });

  if (!booking || booking.status !== "COMPLETED" || booking.userEmail !== user.email) {
    throw new Error("Invalid booking for review");
  }

  // Ensure no duplicate review exists for this booking
  const existing = await prisma.review.findUnique({
    where: { bookingId: booking.id }
  });

  if (existing) {
    throw new Error("You have already reviewed this consultation");
  }

  const review = await prisma.review.create({
    data: {
      userId: user.id,
      consultantProfileId: data.consultantProfileId,
      bookingId: booking.id,
      rating: data.rating,
      comment: data.comment,
      status: "PUBLISHED" // Or PENDING_MODERATION based on business logic
    }
  });

  revalidatePath(`/dashboard/client/reviews`);
  revalidatePath(`/consultant/${booking.consultantProfileId}`); // Refresh public profile rating
  
  await logEvent({
    userId: user.id,
    role: user.role,
    action: "REVIEW_SUBMITTED",
    details: { bookingId: booking.id, consultantProfileId: data.consultantProfileId, rating: data.rating }
  });

  // Analytics: track review_submitted
  await trackEvent({
    eventName: "review_submitted",
    consultantId: data.consultantProfileId,
    metadata: { rating: data.rating }
  });

  return review;
}

import { headers } from "next/headers";

export async function submitGuestReview(data: {
  licenseNumber: string;
  guestName: string;
  guestEmail: string;
  rating: number;
  comment?: string;
}) {
  const profile = await prisma.consultantProfile.findUnique({
    where: { licenseNumber: data.licenseNumber }
  });

  if (!profile) throw new Error("Consultant not found");

  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "Unknown IP";
  const userAgent = headersList.get("user-agent") || "Unknown Browser";
  const secChUa = headersList.get("sec-ch-ua") || "";
  const secChUaPlatform = headersList.get("sec-ch-ua-platform") || "";

  const review = await prisma.review.create({
    data: {
      consultantProfileId: profile.id,
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      rating: data.rating,
      comment: data.comment,
      status: "PUBLISHED",
      metadata: {
        ip,
        userAgent,
        secChUa,
        secChUaPlatform,
        timestamp: new Date().toISOString()
      }
    }
  });

  revalidatePath(`/consultant/${data.licenseNumber}`);

  await trackEvent({
    eventName: "guest_review_submitted",
    consultantId: profile.id,
    metadata: { rating: data.rating }
  });

  return review;
}

export async function replyToReview(reviewId: string, replyText: string) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email || (session.user as any).role !== "CONSULTANT") {
    throw new Error("Unauthorized");
  }

  const consultantProfile = await prisma.consultantProfile.findUnique({
    where: { userId: (session.user as any).id },
    select: { id: true, licenseNumber: true }
  });

  if (!consultantProfile) throw new Error("Profile not found");

  const review = await prisma.review.findUnique({
    where: { id: reviewId }
  });

  if (!review || review.consultantProfileId !== consultantProfile.id) {
    throw new Error("Review not found or unauthorized");
  }

  const updatedValue = replyText.trim() === "" ? null : replyText.trim();

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: {
      replyText: updatedValue,
      repliedAt: updatedValue ? new Date() : null
    }
  });

  revalidatePath(`/dashboard/reviews`);
  revalidatePath(`/consultant/${consultantProfile.licenseNumber}`);

  return updated;
}
