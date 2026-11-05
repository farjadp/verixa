import { describe, it, expect } from "vitest";
import {
  canAcceptBookings,
  isRegistryActive,
  planClientCancellation,
  planConsultantTransition,
  paymentStatusAfterRefund,
  normalizeEmail,
} from "@/lib/booking-rules";

const claimed = { userId: "u1", bookingEnabled: true, verificationLevel: "CICC_EMAIL", status: "Yes" };

describe("isRegistryActive", () => {
  it.each([
    ["Yes", true],
    ["Active", true],
    ["No", false],
    ["Inactive", false],
    ["", false],
    [null, false],
  ])("%s → %s", (status, expected) => {
    expect(isRegistryActive(status as string | null)).toBe(expected);
  });
});

describe("canAcceptBookings", () => {
  it("allows a claimed, verified, active profile", () => {
    expect(canAcceptBookings(claimed).ok).toBe(true);
  });
  it("blocks unclaimed profiles (even if they have seeded consultation types)", () => {
    expect(canAcceptBookings({ ...claimed, userId: null }).ok).toBe(false);
  });
  it("blocks claims pending manual review", () => {
    expect(canAcceptBookings({ ...claimed, verificationLevel: "PENDING_REVIEW" }).ok).toBe(false);
  });
  it("blocks inactive licences", () => {
    expect(canAcceptBookings({ ...claimed, status: "No" }).ok).toBe(false);
  });
  it("blocks when the consultant switched booking off", () => {
    expect(canAcceptBookings({ ...claimed, bookingEnabled: false }).ok).toBe(false);
  });
  it("treats a legacy claim without a level as verified", () => {
    expect(canAcceptBookings({ ...claimed, verificationLevel: null }).ok).toBe(true);
  });
});

describe("planConsultantTransition", () => {
  const now = new Date("2026-12-07T12:00:00Z");
  const future = new Date("2026-12-08T12:00:00Z");
  const past = new Date("2026-12-06T12:00:00Z");
  const base = { scheduledStart: future, now, hasPaymentIntent: true, paymentStatus: "REQUIRES_CAPTURE", priceCents: 15000 };

  it("captures on confirm", () => {
    expect(planConsultantTransition({ ...base, from: "PENDING", to: "CONFIRMED" })).toEqual({ ok: true, payment: "capture", sameStatus: false });
  });

  it("releases the hold on decline", () => {
    expect(planConsultantTransition({ ...base, from: "PENDING", to: "DECLINED" })).toMatchObject({ ok: true, payment: "release" });
  });

  it("refunds when a consultant cancels a captured booking", () => {
    expect(planConsultantTransition({ ...base, from: "CONFIRMED", to: "CANCELLED_BY_CONSULTANT", paymentStatus: "CAPTURED" })).toMatchObject({ ok: true, payment: "refund" });
  });

  it("refuses to confirm when the hold expired", () => {
    const r = planConsultantTransition({ ...base, from: "PENDING", to: "CONFIRMED", paymentStatus: "CANCELED" });
    expect(r.ok).toBe(false);
  });

  it("allows confirming a free consultation without payment", () => {
    expect(planConsultantTransition({ ...base, from: "PENDING", to: "CONFIRMED", hasPaymentIntent: false, paymentStatus: "PENDING", priceCents: 0 })).toMatchObject({ ok: true, payment: "none" });
  });

  it("refuses completed/no-show before the session starts", () => {
    expect(planConsultantTransition({ ...base, from: "CONFIRMED", to: "COMPLETED", paymentStatus: "CAPTURED" }).ok).toBe(false);
    expect(planConsultantTransition({ ...base, from: "CONFIRMED", to: "NO_SHOW", paymentStatus: "CAPTURED" }).ok).toBe(false);
  });

  it("captures a still-held payment on no-show after the start time", () => {
    expect(planConsultantTransition({ ...base, scheduledStart: past, from: "CONFIRMED", to: "NO_SHOW" })).toMatchObject({ ok: true, payment: "capture" });
  });

  it("does nothing to money when already captured and completed", () => {
    expect(planConsultantTransition({ ...base, scheduledStart: past, from: "CONFIRMED", to: "COMPLETED", paymentStatus: "CAPTURED" })).toMatchObject({ ok: true, payment: "none" });
  });

  it("rejects transitions out of terminal states", () => {
    expect(planConsultantTransition({ ...base, from: "COMPLETED", to: "CANCELLED" }).ok).toBe(false);
    expect(planConsultantTransition({ ...base, from: "DECLINED", to: "CONFIRMED" }).ok).toBe(false);
    expect(planConsultantTransition({ ...base, from: "PENDING", to: "COMPLETED" }).ok).toBe(false);
  });

  it("treats a same-status call as a details update with no payment", () => {
    expect(planConsultantTransition({ ...base, from: "CONFIRMED", to: "CONFIRMED" })).toEqual({ ok: true, payment: "none", sameStatus: true });
  });
});

describe("planClientCancellation", () => {
  const now = new Date("2026-12-07T12:00:00Z");
  const base = { scheduledStart: new Date("2026-12-08T12:00:00Z"), now, hasPaymentIntent: true };

  it("releases a hold on a pending request", () => {
    expect(planClientCancellation({ ...base, status: "PENDING", paymentStatus: "REQUIRES_CAPTURE" })).toEqual({ ok: true, payment: "release" });
  });
  it("refunds a confirmed, captured booking", () => {
    expect(planClientCancellation({ ...base, status: "CONFIRMED", paymentStatus: "CAPTURED" })).toEqual({ ok: true, payment: "refund" });
  });
  it("refuses after the session started", () => {
    expect(planClientCancellation({ ...base, status: "CONFIRMED", paymentStatus: "CAPTURED", scheduledStart: new Date("2026-12-07T11:00:00Z") }).ok).toBe(false);
  });
  it("refuses for finished bookings", () => {
    expect(planClientCancellation({ ...base, status: "COMPLETED", paymentStatus: "CAPTURED" }).ok).toBe(false);
  });
});

describe("paymentStatusAfterRefund", () => {
  it("full refund", () => expect(paymentStatusAfterRefund({ refunded: true, amount: 100, amount_refunded: 100 })).toBe("REFUNDED"));
  it("partial refund", () => expect(paymentStatusAfterRefund({ refunded: false, amount: 100, amount_refunded: 40 })).toBe("PARTIALLY_REFUNDED"));
});

describe("normalizeEmail", () => {
  it("lowercases and trims", () => expect(normalizeEmail("  John@X.com ")).toBe("john@x.com"));
});
