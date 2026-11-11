import { beforeEach, describe, expect, it, vi } from "vitest";

const upsert = vi.fn(async (..._a: unknown[]) => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: { emailUnsubscribe: { upsert: (...a: unknown[]) => upsert(...a) } } }));

import { GET, POST } from "./route";
import { signUnsubscribeToken } from "@/lib/unsubscribe";
import { NextRequest } from "next/server";

function req(method: "GET" | "POST", email: string, token: string): NextRequest {
  return new NextRequest(`https://example.test/api/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`, { method });
}

describe("/api/unsubscribe", () => {
  beforeEach(() => {
    process.env.UNSUBSCRIBE_SECRET = "test-secret";
    delete process.env.UNSUBSCRIBE_LEGACY_SECRET;
    upsert.mockClear();
  });

  it("GET valid redirects to success and upserts", async () => {
    const res = await GET(req("GET", "A@B.com", signUnsubscribeToken("a@b.com")));
    expect(res.headers.get("location")).toBe("https://example.test/unsubscribe?status=success");
    expect(upsert).toHaveBeenCalledTimes(1);
    expect((upsert.mock.calls[0][0] as { where: { email: string } }).where.email).toBe("a@b.com");
  });

  it("GET invalid token redirects to invalid without writing", async () => {
    const res = await GET(req("GET", "a@b.com", "x".repeat(24)));
    expect(res.headers.get("location")).toBe("https://example.test/unsubscribe?status=invalid");
    expect(upsert).not.toHaveBeenCalled();
  });

  it("POST valid returns ok", async () => {
    const res = await POST(req("POST", "a@b.com", signUnsubscribeToken("a@b.com")));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("POST invalid returns 400", async () => {
    const res = await POST(req("POST", "a@b.com", "bad"));
    expect(res.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });
});
