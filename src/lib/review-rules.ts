import { z } from "zod";

export const ratingSchema = z.coerce.number().int("Choose a whole-star rating.").min(1, "Choose a rating from 1 to 5.").max(5, "Choose a rating from 1 to 5.");
export const commentSchema = z.string().trim().max(2000, "Reviews can be up to 2,000 characters.").optional();

export const guestReviewSchema = z.object({
  licenseNumber: z.string().trim().min(1).max(32),
  guestName: z.string().trim().min(2, "Enter your name.").max(80),
  guestEmail: z.string().trim().toLowerCase().email("Enter a valid email.").max(200),
  rating: ratingSchema,
  comment: commentSchema,
});

export const bookingReviewSchema = z.object({
  bookingId: z.string().trim().min(1).max(64),
  rating: ratingSchema,
  comment: commentSchema,
});

export const replySchema = z.string().trim().max(2000, "Replies can be up to 2,000 characters.");

/** A client may review a booking once, after it was completed, and only their own. */
export function canReviewBooking(
  booking: { status: string; userEmail: string; scheduledEnd: Date } | null,
  viewerEmail: string,
  alreadyReviewed: boolean
): { ok: true } | { ok: false; error: string } {
  if (!booking || booking.userEmail.trim().toLowerCase() !== viewerEmail.trim().toLowerCase()) {
    return { ok: false, error: "We couldn't find that consultation on your account." };
  }
  if (booking.status !== "COMPLETED") return { ok: false, error: "You can review a consultation once it's marked completed." };
  if (alreadyReviewed) return { ok: false, error: "You've already reviewed this consultation." };
  return { ok: true };
}

/** Average over every published review, rounded to one decimal, or null. */
export function summarizeRatings(agg: { _avg: { rating: number | null }; _count: { _all: number } }) {
  const count = agg._count._all;
  if (!count || agg._avg.rating == null) return { average: null, count: 0 };
  return { average: Math.round(agg._avg.rating * 10) / 10, count };
}

export const GUEST_REVIEW_LIMITS = { perEmailPerProfile: 1, perIpPerDay: 5 };
