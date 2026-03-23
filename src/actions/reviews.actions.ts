"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { revalidatePath } from "next/cache";
import { logEvent } from "@/lib/logger";

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

  return review;
}
