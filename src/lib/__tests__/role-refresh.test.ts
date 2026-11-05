import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/logger", () => ({ logEvent: vi.fn() }));
process.env.NEXTAUTH_SECRET ||= "test-secret";

describe("shouldRefreshRole", async () => {
  const { shouldRefreshRole } = await import("@/lib/authOptions");
  it("refreshes tokens that were never checked (issued before this change)", () => expect(shouldRefreshRole(undefined, 1_000)).toBe(true));
  it("does not hit the DB within a minute", () => expect(shouldRefreshRole(1_000, 30_000)).toBe(false));
  it("refreshes after a minute", () => expect(shouldRefreshRole(1_000, 62_000)).toBe(true));
});
