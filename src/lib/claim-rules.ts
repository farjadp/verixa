// Pure rules for the profile-claim flow.

export type VerificationLevel = "CICC_EMAIL_AND_PHONE" | "CICC_EMAIL" | "CICC_PHONE" | "PENDING_REVIEW";

export function verificationLevelFor(emailMatched: boolean, phoneMatched: boolean): VerificationLevel {
  if (emailMatched && phoneMatched) return "CICC_EMAIL_AND_PHONE";
  if (emailMatched) return "CICC_EMAIL";
  if (phoneMatched) return "CICC_PHONE";
  return "PENDING_REVIEW";
}

export function isRegistryMatched(level: string | null | undefined): boolean {
  return level === "CICC_EMAIL" || level === "CICC_PHONE" || level === "CICC_EMAIL_AND_PHONE";
}

export type ClaimDecision =
  | { action: "claim" }
  | { action: "override"; previousUserId: string }
  | { action: "reject"; error: string };

/**
 * Who gets the profile. An unmatched claim (PENDING_REVIEW) must not lock the
 * real consultant out: a later claim that matches the CICC register replaces
 * it. A matched claim can't be replaced through this flow.
 */
export function decideClaim(
  current: { userId: string | null; verificationLevel: string | null },
  claimant: { userId: string | null; level: VerificationLevel }
): ClaimDecision {
  if (!current.userId) return { action: "claim" };
  if (claimant.userId && current.userId === claimant.userId) return { action: "claim" };
  if (current.verificationLevel === "PENDING_REVIEW" && isRegistryMatched(claimant.level)) {
    return { action: "override", previousUserId: current.userId };
  }
  return { action: "reject", error: "This profile has already been claimed. If this is your licence, contact support." };
}

/** Accounts whose role must never be changed by the public claim flow. */
export function canClaimWithAccount(role: string | null | undefined): boolean {
  return role !== "ADMIN";
}

export const OTP_LIMITS = {
  perLicensePerWindow: 3,
  perTargetPerWindow: 5,
  windowMs: 10 * 60 * 1000,
  maxAttempts: 5,
  ttlMs: 30 * 60 * 1000,
  /** A verified code must be used to finish the claim within this time. */
  verifiedUseWithinMs: 60 * 60 * 1000,
};
