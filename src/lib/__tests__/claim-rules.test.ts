import { describe, it, expect } from "vitest";
import { canClaimWithAccount, decideClaim, verificationLevelFor } from "@/lib/claim-rules";

describe("verificationLevelFor", () => {
  it("both", () => expect(verificationLevelFor(true, true)).toBe("CICC_EMAIL_AND_PHONE"));
  it("email", () => expect(verificationLevelFor(true, false)).toBe("CICC_EMAIL"));
  it("phone", () => expect(verificationLevelFor(false, true)).toBe("CICC_PHONE"));
  it("neither", () => expect(verificationLevelFor(false, false)).toBe("PENDING_REVIEW"));
});

describe("decideClaim", () => {
  it("claims an unclaimed profile", () => {
    expect(decideClaim({ userId: null, verificationLevel: null }, { userId: null, level: "PENDING_REVIEW" })).toEqual({ action: "claim" });
  });
  it("lets a register-matched claim replace an unmatched squatter", () => {
    expect(decideClaim({ userId: "squatter", verificationLevel: "PENDING_REVIEW" }, { userId: null, level: "CICC_EMAIL" })).toEqual({
      action: "override",
      previousUserId: "squatter",
    });
  });
  it("does not let an unmatched claim replace another unmatched claim", () => {
    expect(decideClaim({ userId: "a", verificationLevel: "PENDING_REVIEW" }, { userId: "b", level: "PENDING_REVIEW" }).action).toBe("reject");
  });
  it("never replaces a register-matched claim", () => {
    expect(decideClaim({ userId: "a", verificationLevel: "CICC_EMAIL" }, { userId: "b", level: "CICC_EMAIL_AND_PHONE" }).action).toBe("reject");
  });
  it("lets the same user re-run the claim (e.g. to upgrade verification)", () => {
    expect(decideClaim({ userId: "a", verificationLevel: "PENDING_REVIEW" }, { userId: "a", level: "PENDING_REVIEW" })).toEqual({ action: "claim" });
  });
});

describe("canClaimWithAccount", () => {
  it("blocks admins", () => expect(canClaimWithAccount("ADMIN")).toBe(false));
  it("allows users", () => expect(canClaimWithAccount("USER")).toBe(true));
});
