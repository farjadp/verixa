import { describe, it, expect } from "vitest";
import { canReviewBooking, guestReviewSchema, ratingSchema, summarizeRatings } from "@/lib/review-rules";

describe("ratingSchema", () => {
  it.each([1, 3, 5])("accepts %d", (r) => expect(ratingSchema.safeParse(r).success).toBe(true));
  it.each([0, 6, -1, 2.5, 100])("rejects %d", (r) => expect(ratingSchema.safeParse(r).success).toBe(false));
});

describe("guestReviewSchema", () => {
  it("normalises email and trims", () => {
    const r = guestReviewSchema.parse({ licenseNumber: "R1", guestName: " Ann ", guestEmail: "A@B.CO", rating: 4 });
    expect(r.guestEmail).toBe("a@b.co");
    expect(r.guestName).toBe("Ann");
  });
  it("rejects huge comments", () => {
    expect(guestReviewSchema.safeParse({ licenseNumber: "R1", guestName: "Ann", guestEmail: "a@b.co", rating: 4, comment: "x".repeat(2001) }).success).toBe(false);
  });
});

describe("canReviewBooking", () => {
  const booking = { status: "COMPLETED", userEmail: "Ann@x.com", scheduledEnd: new Date() };
  it("allows the owner of a completed booking (case-insensitive)", () => expect(canReviewBooking(booking, "ann@x.com", false).ok).toBe(true));
  it("rejects someone else", () => expect(canReviewBooking(booking, "bob@x.com", false).ok).toBe(false));
  it("rejects incomplete bookings", () => expect(canReviewBooking({ ...booking, status: "CONFIRMED" }, "ann@x.com", false).ok).toBe(false));
  it("rejects a second review", () => expect(canReviewBooking(booking, "ann@x.com", true).ok).toBe(false));
});

describe("summarizeRatings", () => {
  it("averages all reviews", () => expect(summarizeRatings({ _avg: { rating: 4.333 }, _count: { _all: 12 } })).toEqual({ average: 4.3, count: 12 }));
  it("handles none", () => expect(summarizeRatings({ _avg: { rating: null }, _count: { _all: 0 } })).toEqual({ average: null, count: 0 }));
});
