import { describe, expect, it, vi } from "vitest";
import { ApiError, createApi, FatalApiError, isRetryable } from "./api";

function fakeFetch(status: number, body: unknown) {
  return vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));
}
const make = (f: ReturnType<typeof fakeFetch>) => createApi({ baseUrl: "https://v.test", token: "secret-token", fetch: f as unknown as typeof fetch });

describe("api client", () => {
  it("getTasks sends bearer auth and the channel, returns tasks", async () => {
    const f = fakeFetch(200, { ok: true, tasks: [{ touchId: "t" }] });
    const tasks = await make(f).getTasks("LINKEDIN");
    expect(tasks).toEqual([{ touchId: "t" }]);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://v.test/api/outreach/worker/tasks?channel=LINKEDIN");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer secret-token");
  });

  it("getCandidates passes limit", async () => {
    const f = fakeFetch(200, { ok: true, candidates: [] });
    expect(await make(f).getCandidates(13)).toEqual([]);
    expect(f.mock.calls[0][0]).toBe("https://v.test/api/outreach/worker/candidates?limit=13");
  });

  it("getStatus returns the flags", async () => {
    const f = fakeFetch(200, { ok: true, enabled: true, dryRun: false, invitedHandles: ["a"], invitedLeads: [{ leadId: "l", handle: "a" }] });
    expect(await make(f).getStatus("X")).toEqual({ enabled: true, dryRun: false, invitedHandles: ["a"], invitedLeads: [{ leadId: "l", handle: "a" }] });
    expect(f.mock.calls[0][0]).toBe("https://v.test/api/outreach/worker/status?channel=X");
  });

  it("leadCheck asks about one touch", async () => {
    const f = fakeFetch(200, { ok: true, sendable: false, reason: "profile claimed" });
    expect(await make(f).leadCheck("t 1")).toEqual({ sendable: false, reason: "profile claimed" });
    expect(f.mock.calls[0][0]).toBe("https://v.test/api/outreach/worker/lead-check?touchId=t%201");
  });

  it("report POSTs JSON", async () => {
    const f = fakeFetch(200, { ok: true });
    await make(f).report({ type: "DMS_CLOSED", leadId: "l" });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://v.test/api/outreach/worker/report");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ type: "DMS_CLOSED", leadId: "l" });
    expect((init?.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("heartbeat POSTs", async () => {
    const f = fakeFetch(200, { ok: true });
    await make(f).heartbeat();
    expect(f.mock.calls[0][1]?.method).toBe("POST");
    expect(f.mock.calls[0][0]).toBe("https://v.test/api/outreach/worker/heartbeat");
  });

  it("heartbeat sends imapOk as a JSON body when given, and no body otherwise", async () => {
    const f = fakeFetch(200, { ok: true });
    await make(f).heartbeat({ imapOk: true });
    expect(JSON.parse(String(f.mock.calls[0][1]?.body))).toEqual({ imapOk: true });
    await make(f).heartbeat();
    expect(f.mock.calls[1][1]?.body).toBeUndefined();
  });

  it("non-2xx throws ApiError with status", async () => {
    const err = await make(fakeFetch(500, { ok: false, error: "db down" })).getTasks("X").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).not.toBeInstanceOf(FatalApiError);
    expect(err.status).toBe(500);
    expect(err.message).toContain("db down");
  });

  it("401 is fatal", async () => {
    const err = await make(fakeFetch(401, { ok: false })).getStatus("X").catch((e) => e);
    expect(err).toBeInstanceOf(FatalApiError);
    expect(err.status).toBe(401);
  });

  it("2xx with ok:false is an error", async () => {
    await expect(make(fakeFetch(200, { ok: false, error: "nope" })).getTasks("X")).rejects.toBeInstanceOf(ApiError);
  });

  it("a report the server rejects as not-ok surfaces ApiError", async () => {
    await expect(make(fakeFetch(400, { ok: false, error: "bad" })).report({ type: "DMS_CLOSED", leadId: "l" })).rejects.toBeInstanceOf(ApiError);
  });

  it("never leaks the token into error messages", async () => {
    const err = await make(fakeFetch(500, "<html>oops</html>")).getTasks("X").catch((e) => e);
    expect(String(err.message)).not.toContain("secret-token");
  });
});

describe("isRetryable", () => {
  it("5xx, 429 and network errors retry later; rejections and 401 do not", () => {
    expect(isRetryable(new ApiError("x", 500))).toBe(true);
    expect(isRetryable(new ApiError("x", 503))).toBe(true);
    expect(isRetryable(new ApiError("x", 429))).toBe(true);
    expect(isRetryable(new TypeError("fetch failed"))).toBe(true);
    expect(isRetryable(new ApiError("ok:false", 200))).toBe(false);
    expect(isRetryable(new ApiError("bad", 400))).toBe(false);
    expect(isRetryable(new FatalApiError("401", 401))).toBe(false);
  });
});
