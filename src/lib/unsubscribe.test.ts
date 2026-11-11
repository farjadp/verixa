import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("unsubscribe tokens", () => {
  const original = process.env.UNSUBSCRIBE_SECRET;
  beforeEach(() => { process.env.UNSUBSCRIBE_SECRET = "test-secret"; process.env.NEXT_PUBLIC_APP_URL = "https://example.test"; });
  afterEach(() => { if (original === undefined) delete process.env.UNSUBSCRIBE_SECRET; else process.env.UNSUBSCRIBE_SECRET = original; });

  it("round-trips a token, case-insensitive on email", async () => {
    const { signUnsubscribeToken, verifyUnsubscribeToken } = await import("./unsubscribe");
    const t = signUnsubscribeToken("A@B.com");
    expect(verifyUnsubscribeToken("a@b.com", t)).toBe(true);
  });

  it("rejects wrong and wrong-length tokens without throwing", async () => {
    const { verifyUnsubscribeToken } = await import("./unsubscribe");
    expect(verifyUnsubscribeToken("a@b.com", "x".repeat(24))).toBe(false);
    expect(verifyUnsubscribeToken("a@b.com", "short")).toBe(false);
  });

  it("fails closed when the secret is unset", async () => {
    delete process.env.UNSUBSCRIBE_SECRET;
    const { signUnsubscribeToken, verifyUnsubscribeToken } = await import("./unsubscribe");
    expect(() => signUnsubscribeToken("a@b.com")).toThrow(/UNSUBSCRIBE_SECRET/);
    expect(verifyUnsubscribeToken("a@b.com", "anything")).toBe(false);
  });

  it("body link points at the API route that records the unsubscribe", async () => {
    const { buildUnsubscribeUrl } = await import("./unsubscribe");
    expect(buildUnsubscribeUrl("a@b.com")).toMatch(/^https:\/\/example\.test\/api\/unsubscribe\?email=a%40b\.com&token=[0-9a-f]{24}$/);
  });

  it("accepts legacy-signed tokens only when UNSUBSCRIBE_LEGACY_SECRET is set", async () => {
    const { signUnsubscribeToken, verifyUnsubscribeToken } = await import("./unsubscribe");
    process.env.UNSUBSCRIBE_SECRET = "old-secret";
    const legacyToken = signUnsubscribeToken("a@b.com");
    process.env.UNSUBSCRIBE_SECRET = "test-secret";
    delete process.env.UNSUBSCRIBE_LEGACY_SECRET;
    expect(verifyUnsubscribeToken("a@b.com", legacyToken)).toBe(false);
    process.env.UNSUBSCRIBE_LEGACY_SECRET = "old-secret";
    expect(verifyUnsubscribeToken("A@b.com", legacyToken)).toBe(true);
    expect(verifyUnsubscribeToken("a@b.com", "x".repeat(24))).toBe(false);
    // signing always uses the primary secret
    expect(signUnsubscribeToken("a@b.com")).not.toBe(legacyToken);
    delete process.env.UNSUBSCRIBE_LEGACY_SECRET;
  });

  it("stays fail-closed when the primary secret is unset even if legacy is set", async () => {
    const { verifyUnsubscribeToken } = await import("./unsubscribe");
    delete process.env.UNSUBSCRIBE_SECRET;
    process.env.UNSUBSCRIBE_LEGACY_SECRET = "old-secret";
    expect(verifyUnsubscribeToken("a@b.com", "anything")).toBe(false);
    delete process.env.UNSUBSCRIBE_LEGACY_SECRET;
  });

  it("builds a one-click API URL", async () => {
    const { buildOneClickUnsubscribeUrl } = await import("./unsubscribe");
    expect(buildOneClickUnsubscribeUrl("a@b.com")).toMatch(/^https:\/\/example\.test\/api\/unsubscribe\?email=a%40b\.com&token=[0-9a-f]{24}$/);
  });
});
