import { describe, expect, it, vi } from "vitest";
import type { AdapterResult } from "../adapters/types";
import { ApiError, FatalApiError } from "../api";
import { candidate, type FakeApiOpts, fakeAdapter, fakeApi, memState, MONDAY_9AM, ok, SATURDAY, task } from "../testkit";
import { describePlan, EXIT, runWork, type WorkDeps } from "./work";

function setup(over: { adapters?: Partial<Record<"LINKEDIN" | "X", Parameters<typeof fakeAdapter>[1]>>; tasks?: FakeApiOpts["tasks"]; now?: Date; imap?: WorkDeps["imap"]; status?: FakeApiOpts["status"]; candidates?: ReturnType<typeof candidate>[] } = {}) {
  const { api, reports } = fakeApi({ tasks: over.tasks, status: over.status, candidates: over.candidates ?? [candidate(1)] });
  const adapters = { LINKEDIN: fakeAdapter("LINKEDIN", over.adapters?.LINKEDIN), X: fakeAdapter("X", over.adapters?.X) };
  const order: string[] = [];
  const deps: WorkDeps = { api, adapters, state: memState(), now: () => over.now ?? MONDAY_9AM, sleep: async () => {}, rng: () => 0.5, tz: "America/Toronto", log: () => {}, candidateLimit: 13, imap: over.imap };
  for (const ch of ["LINKEDIN", "X"] as const) {
    const a = adapters[ch];
    for (const m of ["findProfile", "sendMessage", "readInbox"] as const) {
      const orig = a[m] as (...args: unknown[]) => unknown;
      (a as unknown as Record<string, unknown>)[m] = vi.fn(async (...args: unknown[]) => { order.push(`${ch}:${m}`); return orig(...args); });
    }
  }
  return { deps, api, adapters, reports, order };
}

describe("runWork", () => {
  it("runs discover -> inbox -> tasks for each channel in order, then heartbeats", async () => {
    const s = setup({ tasks: [task(1)] });
    const r = await runWork(s.deps);
    expect(s.order.filter((o) => o.startsWith("LINKEDIN"))).toEqual(["LINKEDIN:findProfile", "LINKEDIN:readInbox", "LINKEDIN:sendMessage"]);
    expect(s.order.indexOf("X:findProfile")).toBeGreaterThan(s.order.indexOf("LINKEDIN:sendMessage"));
    expect(r.exitCode).toBe(EXIT.OK);
    expect(s.api.heartbeat).toHaveBeenCalled();
  });

  it("a reply read this run is reported before any send on that channel", async () => {
    const s = setup({ tasks: [task(1)], adapters: { LINKEDIN: { readInbox: vi.fn(async () => ok({ acceptedHandles: [], replies: [{ handle: "h9", body: "yes please" }] })) } } });
    const seq: string[] = [];
    (s.api.report as ReturnType<typeof vi.fn>).mockImplementation(async (r: { type: string }) => { seq.push(`report:${r.type}`); });
    const send = s.adapters.LINKEDIN.sendMessage as ReturnType<typeof vi.fn>;
    const orig = send.getMockImplementation()!;
    send.mockImplementation(async (...a: unknown[]) => { seq.push("send"); return orig(...a); });
    await runWork(s.deps);
    expect(seq.indexOf("report:REPLY")).toBeGreaterThanOrEqual(0);
    expect(seq.indexOf("report:REPLY")).toBeLessThan(seq.indexOf("send"));
  });

  it("an inbox halt skips that channel's tasks; the other channel still runs", async () => {
    const s = setup({ tasks: [task(1)], adapters: { LINKEDIN: { readInbox: vi.fn(async () => ({ status: "checkpoint", detail: "wall" }) as AdapterResult<never>) } } });
    const r = await runWork(s.deps);
    expect(s.order).toContain("LINKEDIN:readInbox");
    expect(s.order).not.toContain("LINKEDIN:sendMessage");
    expect(s.order).toContain("X:sendMessage");
    expect(r.channels.LINKEDIN.halted).toBe(true);
    expect(r.exitCode).toBe(EXIT.HALT);
  });

  it("a plain inbox error marks the channel errored but its tasks still run", async () => {
    const s = setup({ tasks: [task(1)], adapters: { LINKEDIN: { readInbox: vi.fn(async () => { throw new Error("boom"); }) } } });
    const r = await runWork(s.deps);
    expect(s.order).toContain("LINKEDIN:sendMessage");
    expect(r.channels.LINKEDIN.errored).toBe(true);
    expect(r.exitCode).toBe(EXIT.ERROR);
  });

  it("fetches candidates once", async () => {
    const s = setup();
    await runWork(s.deps);
    expect(s.api.getCandidates).toHaveBeenCalledTimes(1);
    expect(s.api.getCandidates).toHaveBeenCalledWith(13);
  });

  it("a halted channel skips its remaining steps but the other channel still runs; exit code is HALT", async () => {
    const s = setup({ tasks: [task(1)], adapters: { LINKEDIN: { findProfile: vi.fn(async () => ({ status: "checkpoint", detail: "captcha" }) as AdapterResult<never>) } } });
    const r = await runWork(s.deps);
    expect(s.order).not.toContain("LINKEDIN:sendMessage");
    expect(s.order).not.toContain("LINKEDIN:readInbox");
    expect(s.order).toContain("X:findProfile");
    expect(r.exitCode).toBe(EXIT.HALT);
    expect(r.channels.LINKEDIN.halted).toBe(true);
  });

  it("halt during the task run is a HALT exit (inbox already ran before tasks)", async () => {
    const s = setup({ tasks: (ch) => (ch === "X" ? [task(1)] : []), adapters: { X: { sendMessage: vi.fn(async () => ({ status: "broken", detail: "gone", screenshot: "s.png" }) as AdapterResult<never>) } } });
    const r = await runWork(s.deps);
    expect(s.order.indexOf("X:readInbox")).toBeLessThan(s.order.indexOf("X:sendMessage"));
    expect(r.channels.X.halted).toBe(true);
    expect(r.exitCode).toBe(EXIT.HALT);
  });

  it("does no browser work outside the window but still reads IMAP and heartbeats", async () => {
    const commit = vi.fn();
    const s = setup({ now: SATURDAY, imap: async () => ({ replies: [{ email: "a@b.ca", body: "hi" }], commit }) });
    const r = await runWork(s.deps);
    expect(s.order).toEqual([]);
    expect(s.reports).toEqual([{ type: "REPLY", channel: "EMAIL", email: "a@b.ca", body: "hi" }]);
    expect(commit).toHaveBeenCalled();
    expect(r.exitCode).toBe(EXIT.OK);
    expect(s.api.heartbeat).toHaveBeenCalled();
  });

  it("does not commit the IMAP UID when a reply report fails, and exits with ERROR", async () => {
    const commit = vi.fn();
    const s = setup({ imap: async () => ({ replies: [{ email: "a@b.ca", body: "hi" }], commit }) });
    (s.api.report as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new ApiError("500", 500));
    const r = await runWork(s.deps);
    expect(commit).not.toHaveBeenCalled();
    expect(r.exitCode).toBe(EXIT.ERROR);
  });

  it("a rejected email reply (ok:false) is skipped; the UID is still committed and later replies still go out", async () => {
    const commit = vi.fn();
    const s = setup({ imap: async () => ({ replies: [{ email: "a@b.ca", body: "1" }, { email: "c@d.ca", body: "2" }], commit }) });
    (s.api.report as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new ApiError("skipped", 200));
    const r = await runWork(s.deps);
    expect(s.api.report).toHaveBeenCalledTimes(2);
    expect(commit).toHaveBeenCalled();
    expect(r.exitCode).toBe(EXIT.OK);
  });

  it("an IMAP failure is an ERROR exit but does not stop channels", async () => {
    const s = setup({ imap: async () => { throw new Error("auth failed"); } });
    const r = await runWork(s.deps);
    expect(s.order).toContain("X:readInbox");
    expect(r.exitCode).toBe(EXIT.ERROR);
  });

  it("an adapter error in one step is an ERROR exit", async () => {
    const s = setup({ adapters: { LINKEDIN: { readInbox: vi.fn(async () => { throw new Error("x"); }) } } });
    expect((await runWork(s.deps)).exitCode).toBe(EXIT.ERROR);
  });

  it("disabled channels are a clean exit", async () => {
    const s = setup({ status: { enabled: false } });
    const r = await runWork(s.deps);
    expect(r.exitCode).toBe(EXIT.OK);
    expect(s.order).toEqual([]);
  });

  it("an auth failure propagates so the caller can exit with AUTH", async () => {
    const s = setup();
    (s.api.getStatus as ReturnType<typeof vi.fn>).mockRejectedValue(new FatalApiError("unauthorized", 401));
    await expect(runWork(s.deps)).rejects.toBeInstanceOf(FatalApiError);
  });

  it("HALT outranks ERROR", async () => {
    const s = setup({ imap: async () => { throw new Error("x"); }, adapters: { LINKEDIN: { findProfile: vi.fn(async () => ({ status: "checkpoint", detail: "c" }) as AdapterResult<never>) } } });
    expect((await runWork(s.deps)).exitCode).toBe(EXIT.HALT);
  });

  it("a candidates fetch failure is logged and discovery is skipped, tasks still run", async () => {
    const s = setup({ tasks: [task(1)] });
    (s.api.getCandidates as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new ApiError("500", 500));
    const r = await runWork(s.deps);
    expect(s.order).toContain("LINKEDIN:sendMessage");
    expect(s.order).not.toContain("LINKEDIN:findProfile");
    expect(r.exitCode).toBe(EXIT.ERROR);
  });
});

describe("describePlan", () => {
  it("describes the window, channels and candidates without fetching tasks or touching a browser", async () => {
    const s = setup({ candidates: [candidate(1), candidate(2)], status: { dryRun: true, invitedLeads: [{ leadId: "L", handle: "h" }], invitedHandles: ["h"] } });
    const lines = await describePlan(s.deps, true);
    const text = lines.join("\n");
    expect(text).toMatch(/send window: OPEN/i);
    expect(text).toMatch(/LINKEDIN: enabled/i);
    expect(text).toMatch(/dry-run/i);
    expect(text).toMatch(/2 candidate/);
    expect(text).toMatch(/1 invited/);
    expect(text).toMatch(/IMAP: will run/);
    expect(s.api.getTasks).not.toHaveBeenCalled();
    expect(s.order).toEqual([]);
  });
  it("reports a closed window", async () => {
    const s = setup({ now: SATURDAY });
    expect((await describePlan(s.deps, false)).join("\n")).toMatch(/send window: CLOSED/i);
  });
});
