import { describe, expect, it, vi } from "vitest";
import type { AdapterResult, InboxEvents } from "../adapters/types";
import { ApiError } from "../api";
import { fakeAdapter, fakeApi, type FakeApiOpts, MONDAY_9AM, ok, SATURDAY } from "../testkit";
import { runInbox, type InboxDeps } from "./inbox";

const invited = { invitedHandles: ["Jane", "bob"], invitedLeads: [{ leadId: "L1", handle: "Jane" }, { leadId: "L2", handle: "bob" }] };

function setup(events: AdapterResult<InboxEvents>, over: { status?: FakeApiOpts["status"]; now?: Date } = {}) {
  const { api, reports } = fakeApi({ status: over.status ?? invited });
  const adapter = fakeAdapter("LINKEDIN", { readInbox: vi.fn(async () => events) });
  const deps: InboxDeps = { api, adapter, now: () => over.now ?? MONDAY_9AM, tz: "America/Toronto", log: () => {} };
  return { deps, adapter, reports, api };
}

describe("runInbox", () => {
  it("reports acceptances by lead id (case-insensitive) and replies by handle", async () => {
    const s = setup(ok({ acceptedHandles: ["jane"], replies: [{ handle: "bob", body: "thanks" }] }));
    const r = await runInbox("LINKEDIN", s.deps);
    expect(s.adapter.readInbox).toHaveBeenCalledWith(["Jane", "bob"]);
    expect(s.reports).toEqual([
      { type: "INVITE_ACCEPTED", leadId: "L1" },
      { type: "REPLY", channel: "LINKEDIN", handle: "bob", body: "thanks" },
    ]);
    expect(r).toMatchObject({ outcome: "completed", accepted: 1, replies: 1 });
  });

  it("truncates reply bodies to the schema limit", async () => {
    const s = setup(ok({ acceptedHandles: [], replies: [{ handle: "bob", body: "x".repeat(9000) }] }));
    await runInbox("LINKEDIN", s.deps);
    expect((s.reports[0] as { body: string }).body).toHaveLength(8000);
  });

  it("does nothing when the channel is disabled", async () => {
    const s = setup(ok({ acceptedHandles: [], replies: [] }), { status: { enabled: false } });
    expect((await runInbox("LINKEDIN", s.deps)).outcome).toBe("disabled");
    expect(s.adapter.readInbox).not.toHaveBeenCalled();
  });

  it("does nothing outside the window", async () => {
    const s = setup(ok({ acceptedHandles: [], replies: [] }), { now: SATURDAY });
    expect((await runInbox("LINKEDIN", s.deps)).outcome).toBe("outside_window");
    expect(s.adapter.readInbox).not.toHaveBeenCalled();
  });

  it("reports what was read before a halt, then halts", async () => {
    const s = setup({ status: "broken", detail: "conversation sender missing", screenshot: "s.png", partial: { acceptedHandles: ["jane"], replies: [{ handle: "bob", body: "stop please" }] } });
    const r = await runInbox("LINKEDIN", s.deps);
    expect(s.reports.map((x) => x.type)).toEqual(["INVITE_ACCEPTED", "REPLY", "CHANNEL_HALT"]);
    expect(r).toMatchObject({ outcome: "halted", accepted: 1, replies: 1 });
  });

  it("halts on checkpoint", async () => {
    const s = setup({ status: "checkpoint", detail: "authwall" });
    expect((await runInbox("LINKEDIN", s.deps)).outcome).toBe("halted");
    expect(s.reports).toEqual([{ type: "CHANNEL_HALT", channel: "LINKEDIN", reason: "CHECKPOINT", detail: "authwall" }]);
  });

  it("halts on broken with screenshot", async () => {
    const s = setup({ status: "broken", detail: "list missing", screenshot: "s.png" });
    await runInbox("LINKEDIN", s.deps);
    expect(s.reports[0]).toMatchObject({ reason: "ADAPTER_BROKEN" });
  });

  it("halts on a pre-read checkpoint", async () => {
    const s = setup(ok({ acceptedHandles: [], replies: [] }));
    (s.adapter.detectCheckpoint as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);
    await runInbox("LINKEDIN", s.deps);
    expect(s.adapter.readInbox).not.toHaveBeenCalled();
  });

  it("a thrown read error is an error outcome, not a halt", async () => {
    const s = setup(ok({ acceptedHandles: [], replies: [] }));
    (s.adapter.readInbox as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("boom"));
    expect((await runInbox("LINKEDIN", s.deps)).outcome).toBe("error");
  });

  it("a rejected report (ok:false / 4xx) is skipped and the batch continues", async () => {
    const s = setup(ok({ acceptedHandles: ["Jane"], replies: [{ handle: "a", body: "1" }, { handle: "b", body: "2" }] }));
    (s.api.report as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new ApiError("no active lead", 200));
    const r = await runInbox("LINKEDIN", s.deps);
    expect(s.api.report).toHaveBeenCalledTimes(3);
    expect(r.outcome).toBe("completed");
    expect(r).toMatchObject({ accepted: 0, replies: 2 });
  });

  it("stops with error if a report fails", async () => {
    const s = setup(ok({ acceptedHandles: ["Jane", "bob"], replies: [] }));
    (s.api.report as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new ApiError("boom", 503));
    const r = await runInbox("LINKEDIN", s.deps);
    expect(r.outcome).toBe("error");
    expect(s.api.report).toHaveBeenCalledTimes(1);
  });
});
