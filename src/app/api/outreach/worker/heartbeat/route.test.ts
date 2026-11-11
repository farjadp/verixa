import { beforeEach, describe, expect, it, vi } from "vitest";

const recordHeartbeat = vi.fn(async (..._a: unknown[]) => {});
vi.mock("@/lib/outreach/settings", () => ({ recordHeartbeat: (...a: unknown[]) => recordHeartbeat(...a) }));

import { NextRequest } from "next/server";
import { POST } from "./route";

const req = (body?: string, token = "tok") =>
  new NextRequest("https://example.test/api/outreach/worker/heartbeat", {
    method: "POST", headers: { authorization: `Bearer ${token}`, ...(body === undefined ? {} : { "content-type": "application/json" }) }, body,
  });

describe("/api/outreach/worker/heartbeat", () => {
  beforeEach(() => {
    process.env.OUTREACH_WORKER_TOKEN = "tok";
    recordHeartbeat.mockClear();
  });

  it("rejects a bad token without recording", async () => {
    expect((await POST(req(undefined, "nope"))).status).toBe(401);
    expect(recordHeartbeat).not.toHaveBeenCalled();
  });

  it("accepts an empty body (older workers) and does not mark the inbox read", async () => {
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(recordHeartbeat).toHaveBeenCalledWith(expect.any(Date), { inboxRead: false });
  });

  it("marks the inbox read when imapOk is true", async () => {
    expect((await POST(req(JSON.stringify({ imapOk: true })))).status).toBe(200);
    expect(recordHeartbeat).toHaveBeenCalledWith(expect.any(Date), { inboxRead: true });
  });

  it("does not mark the inbox read when imapOk is false", async () => {
    await POST(req(JSON.stringify({ imapOk: false })));
    expect(recordHeartbeat).toHaveBeenCalledWith(expect.any(Date), { inboxRead: false });
  });

  it("rejects a malformed body with 400 and records nothing", async () => {
    expect((await POST(req("{not json"))).status).toBe(400);
    expect((await POST(req(JSON.stringify({ imapOk: "yes" })))).status).toBe(400);
    expect(recordHeartbeat).not.toHaveBeenCalled();
  });
});
