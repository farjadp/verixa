// Pure booking rules: who can be booked, which status changes are allowed,
// and what each change must do to the escrow payment. No I/O here so the
// rules are unit-tested; booking.actions.ts applies them.

export type PaymentAction = "capture" | "release" | "refund" | "none";

export type RuleResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/** CICC register status values seen in the data: "Yes", "No", "Active". */
export function isRegistryActive(status: string | null | undefined): boolean {
  const s = (status ?? "").trim().toLowerCase();
  if (!s || s.includes("inactive") || s.includes("revoked") || s.includes("suspend")) return false;
  return s === "yes" || s.includes("active");
}

export type BookableProfile = {
  userId: string | null;
  bookingEnabled: boolean;
  verificationLevel: string | null;
  status: string | null;
};

/**
 * A profile takes bookings only when a real person has claimed it, finished
 * identity checks, switched booking on, and the licence is active.
 * A null verificationLevel on a claimed profile is a legacy claim (before
 * levels existed) and is treated as verified.
 */
export function canAcceptBookings(p: BookableProfile): RuleResult {
  if (!p.userId) return { ok: false, error: "This profile has not been claimed by the consultant yet." };
  if (p.verificationLevel === "PENDING_REVIEW") {
    return { ok: false, error: "This consultant's identity is still being reviewed. Booking opens once it is verified." };
  }
  if (!isRegistryActive(p.status)) {
    return { ok: false, error: "This consultant's licence is not listed as active on the CICC register." };
  }
  if (!p.bookingEnabled) return { ok: false, error: "This consultant is not accepting bookings right now." };
  return { ok: true };
}

export const CONSULTANT_TARGET_STATUSES = [
  "CONFIRMED",
  "DECLINED",
  "COMPLETED",
  "NO_SHOW",
  "CANCELLED",
  "CANCELLED_BY_CONSULTANT",
] as const;
export type ConsultantTargetStatus = (typeof CONSULTANT_TARGET_STATUSES)[number];

const ALLOWED: Record<string, readonly ConsultantTargetStatus[]> = {
  PENDING: ["CONFIRMED", "DECLINED", "CANCELLED", "CANCELLED_BY_CONSULTANT"],
  CONFIRMED: ["COMPLETED", "NO_SHOW", "CANCELLED", "CANCELLED_BY_CONSULTANT"],
};

/** Payment states in which no money is held or captured any more. */
const DEAD_PAYMENT = new Set(["CANCELED", "FAILED", "REFUNDED"]);

export type TransitionInput = {
  from: string;
  to: ConsultantTargetStatus;
  scheduledStart: Date;
  now: Date;
  hasPaymentIntent: boolean;
  paymentStatus: string | null;
  priceCents: number;
};

export function planConsultantTransition(i: TransitionInput): RuleResult<{ payment: PaymentAction; sameStatus: boolean }> {
  if (i.from === i.to) return { ok: true, payment: "none", sameStatus: true };

  const allowed = ALLOWED[i.from] ?? [];
  if (!allowed.includes(i.to)) {
    return { ok: false, error: `A ${i.from.toLowerCase()} booking cannot be changed to ${i.to.toLowerCase().replace(/_/g, " ")}.` };
  }

  if ((i.to === "COMPLETED" || i.to === "NO_SHOW") && i.now < i.scheduledStart) {
    return { ok: false, error: "You can only mark a session completed or no-show after its start time." };
  }

  const held = i.hasPaymentIntent && i.paymentStatus === "REQUIRES_CAPTURE";
  const captured = i.hasPaymentIntent && i.paymentStatus === "CAPTURED";

  if (i.to === "CONFIRMED" && i.priceCents > 0 && !held && !captured) {
    if (!i.hasPaymentIntent || DEAD_PAYMENT.has(i.paymentStatus ?? "")) {
      return {
        ok: false,
        error: "The client's payment hold is no longer valid (expired, failed or released). Decline this request so they can rebook.",
      };
    }
  }

  let payment: PaymentAction = "none";
  if (i.to === "CONFIRMED" || i.to === "COMPLETED" || i.to === "NO_SHOW") {
    // A missed session is billable, same as when the hold was captured at confirmation.
    if (held) payment = "capture";
  } else {
    // DECLINED / CANCELLED / CANCELLED_BY_CONSULTANT: the client gets everything back.
    if (held) payment = "release";
    else if (captured) payment = "refund";
  }

  return { ok: true, payment, sameStatus: false };
}

export type ClientCancelInput = {
  status: string;
  scheduledStart: Date;
  now: Date;
  hasPaymentIntent: boolean;
  paymentStatus: string | null;
};

export function planClientCancellation(i: ClientCancelInput): RuleResult<{ payment: PaymentAction }> {
  if (i.status !== "PENDING" && i.status !== "CONFIRMED") {
    return { ok: false, error: "This booking can no longer be cancelled." };
  }
  if (i.now >= i.scheduledStart) {
    return { ok: false, error: "This session has already started. Contact support if something went wrong." };
  }
  let payment: PaymentAction = "none";
  if (i.hasPaymentIntent && i.paymentStatus === "REQUIRES_CAPTURE") payment = "release";
  else if (i.hasPaymentIntent && i.paymentStatus === "CAPTURED") payment = "refund";
  return { ok: true, payment };
}

/** Payment status after a Stripe charge.refunded event. */
export function paymentStatusAfterRefund(charge: { refunded?: boolean; amount?: number; amount_refunded?: number }): string {
  if (charge.refunded) return "REFUNDED";
  if (charge.amount && charge.amount_refunded != null && charge.amount_refunded >= charge.amount) return "REFUNDED";
  return "PARTIALLY_REFUNDED";
}

export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}
