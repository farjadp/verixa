import { describe, it, expect } from "vitest";
import { loginErrorMessage, safeCallbackPath } from "@/lib/safe-redirect";

describe("safeCallbackPath", () => {
  it.each([
    ["/consultant/R1/book", "/consultant/R1/book"],
    ["%2Fdashboard%2Fbooking", "/dashboard/booking"],
    ["//evil.com", "/dashboard"],
    ["/\\evil.com", "/dashboard"],
    ["https://evil.com", "/dashboard"],
    [null, "/dashboard"],
  ])("%s → %s", (raw, expected) => expect(safeCallbackPath(raw as string | null)).toBe(expected));
});

describe("loginErrorMessage", () => {
  it("maps the NextAuth code", () => expect(loginErrorMessage("CredentialsSignin")).toBe("Incorrect email or password."));
  it("keeps the rate-limit message", () => expect(loginErrorMessage("Too many login attempts. Please try again in 15 minutes.")).toMatch(/Too many/));
});
