// What we can truthfully say about a consultant's identity, derived from the
// claim verification level. Used by the public profile and the booking page.

export type TrustSummary = {
  claimed: boolean;
  emailMatched: boolean;
  phoneMatched: boolean;
  pendingReview: boolean;
  label: string;
  detail: string;
  tone: "verified" | "partial" | "pending" | "unclaimed";
};

export function describeVerification(claimed: boolean, level: string | null | undefined): TrustSummary {
  const emailMatched = claimed && (level === "CICC_EMAIL" || level === "CICC_EMAIL_AND_PHONE");
  const phoneMatched = claimed && (level === "CICC_PHONE" || level === "CICC_EMAIL_AND_PHONE");
  const pendingReview = claimed && level === "PENDING_REVIEW";

  if (!claimed) {
    return {
      claimed, emailMatched, phoneMatched, pendingReview,
      label: "Not claimed yet",
      detail: "Listed from the public CICC register. The consultant has not claimed this profile on Verixa.",
      tone: "unclaimed",
    };
  }
  if (pendingReview) {
    return {
      claimed, emailMatched, phoneMatched, pendingReview,
      label: "Identity under review",
      detail: "Claimed with contact details that don't match the CICC register. Verixa is reviewing it manually.",
      tone: "pending",
    };
  }
  if (emailMatched && phoneMatched) {
    return {
      claimed, emailMatched, phoneMatched, pendingReview,
      label: "Identity verified",
      detail: "Claimed using the email and phone number listed on the CICC register.",
      tone: "verified",
    };
  }
  if (emailMatched || phoneMatched) {
    return {
      claimed, emailMatched, phoneMatched, pendingReview,
      label: "Identity verified",
      detail: `Claimed using the ${emailMatched ? "email" : "phone number"} listed on the CICC register.`,
      tone: "partial",
    };
  }
  return {
    claimed, emailMatched, phoneMatched, pendingReview,
    label: "Claimed",
    detail: "This profile was claimed before register-matching checks were introduced.",
    tone: "partial",
  };
}

export function formatPrice(cents: number): string {
  if (cents <= 0) return "Free";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export const COMMUNICATION_LABELS: Record<string, string> = {
  VIDEO: "Video call",
  PHONE: "Phone call",
  IN_PERSON: "In person",
};
