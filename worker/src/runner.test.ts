import { describe, expect, it, vi } from "vitest";
import { ApiError, type Api } from "./api";
import type { AdapterResult, ChannelAdapter } from "./adapters/types";
import { runChannel, type RunnerDeps, type RunnerState } from "./runner";
import type { WorkerReport, WorkerStatus, WorkerTask } from "./types";

const MONDAY_9AM = new Date("2026-11-09T14:00:00Z"); // 09:00 Toronto
const SATURDAY = new Date("2026-11-14T14:00:00Z");

const task = (n: number, over: Partial<WorkerTask> = {}): WorkerTask => ({ touchId: `t${n}`, leadId: `l${n}`, kind: "TOUCH", step: 2, handle: `h${n}`, body: `hello ${n}`, dryRun: false, ...over });
const ok = <T,>(value: T): AdapterResult<T> => ({ status: "ok", value });

function memState(): RunnerState {
  const actions: { day: string; channel: string; touchId: string }[] = [];
  return {
    hasAction: (id) => actions.some((a) => a.touchId === id),
    recordAction: (day, e) => void actions.push({ day, channel: e.channel, touchId: e.touchId }),
    countActions: (day, ch) => actions.filter((a) => a.day === day && a.channel === ch).length,
  };
}

function setup(tasks: WorkerTask[], opts: { statuses?: Partial<WorkerStatus>[]; now?: Date; adapter?: Partial<ChannelAdapter>; state?: RunnerState; reportFails?: boolean } = {}) {
  const statuses = opts.statuses ?? [{}];
  let si = 0;
  const reports: WorkerReport[] = [];
  const calls: string[] = [];
  const api: Api = {
    getStatus: vi.fn(async () => { calls.push("status"); const s = statuses[Math.min(si++, statuses.length - 1)]; return { enabled: true, dryRun: false, invitedHandles: [], invitedLeads: [], ...s }; }),
    getTasks: vi.fn(async () => { calls.push("tasks"); return tasks; }),
    getCandidates: vi.fn(async () => []),
    report: vi.fn(async (r: WorkerReport) => { calls.push(`report:${r.type}`); if (opts.reportFails) throw new Error("net down"); reports.push(r); }),
    heartbeat: vi.fn(async () => { calls.push("heartbeat"); }),
  };
  const adapter: ChannelAdapter = {
    channel: "LINKEDIN",
    findProfile: vi.fn(async () => ok([])),
    invite: vi.fn(async () => { calls.push("invite"); return ok({ externalMessageId: "inv-1" }); }),
    sendMessage: vi.fn(async () => { calls.push("send"); return ok({ externalMessageId: "msg-1" }); }),
    hasSentText: vi.fn(async () => ok(false)),
    readInbox: vi.fn(async () => ok({ acceptedHandles: [], replies: [] })),
    detectCheckpoint: vi.fn(async () => false),
    ...opts.adapter,
  };
  const sleep = vi.fn(async (_ms: number) => { calls.push("sleep"); });
  const deps: RunnerDeps = { api, adapter, state: opts.state ?? memState(), now: () => opts.now ?? MONDAY_9AM, sleep, rng: () => 0.5, tz: "America/Toronto", log: () => {} };
  return { deps, api, adapter, reports, calls, sleep };
}

describe("runChannel", () => {
  it("does nothing outside the send window but still sends a heartbeat", async () => {
    const s = setup([task(1)], { now: SATURDAY });
    const r = await runChannel("LINKEDIN", s.deps);
    expect(r.outcome).toBe("outside_window");
    expect(s.api.getTasks).not.toHaveBeenCalled();
    expect(s.adapter.sendMessage).not.toHaveBeenCalled();
    expect(s.api.heartbeat).toHaveBeenCalledTimes(1);
  });

  it("does nothing when Verixa says the channel is disabled", async () => {
    const s = setup([task(1)], { statuses: [{ enabled: false }] });
    expect((await runChannel("LINKEDIN", s.deps)).outcome).toBe("disabled");
    expect(s.api.getTasks).not.toHaveBeenCalled();
    expect(s.api.heartbeat).toHaveBeenCalled();
  });

  it("fails closed when the status check errors", async () => {
    const s = setup([task(1)]);
    (s.api.getStatus as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("503"));
    const r = await runChannel("LINKEDIN", s.deps);
    expect(r.outcome).toBe("error");
    expect(s.adapter.sendMessage).not.toHaveBeenCalled();
    expect(s.api.heartbeat).toHaveBeenCalled();
  });

  it("sends a TOUCH with sendMessage and reports SENT with the external id", async () => {
    const s = setup([task(1)]);
    const r = await runChannel("LINKEDIN", s.deps);
    expect(s.adapter.sendMessage).toHaveBeenCalledWith("h1", "hello 1");
    expect(s.reports).toEqual([{ type: "TOUCH_RESULT", touchId: "t1", status: "SENT", externalMessageId: "msg-1" }]);
    expect(r).toMatchObject({ outcome: "completed", sent: 1 });
  });

  it("sends an INVITE with invite()", async () => {
    const s = setup([task(1, { kind: "INVITE", step: 1, body: "short note" })]);
    await runChannel("LINKEDIN", s.deps);
    expect(s.adapter.invite).toHaveBeenCalledWith("h1", "short note");
    expect(s.adapter.sendMessage).not.toHaveBeenCalled();
  });

  it("fails an over-long invite note without touching the browser", async () => {
    const s = setup([task(1, { kind: "INVITE", step: 1, body: "x".repeat(301) })]);
    await runChannel("LINKEDIN", s.deps);
    expect(s.adapter.invite).not.toHaveBeenCalled();
    expect(s.reports[0]).toMatchObject({ type: "TOUCH_RESULT", status: "FAILED" });
  });

  it("leaves dryRun tasks completely untouched: no adapter call, no report, no gap", async () => {
    const s = setup([task(1, { dryRun: true }), task(2, { dryRun: true })]);
    const r = await runChannel("LINKEDIN", s.deps);
    expect(s.adapter.hasSentText).not.toHaveBeenCalled();
    expect(s.adapter.sendMessage).not.toHaveBeenCalled();
    expect(s.adapter.invite).not.toHaveBeenCalled();
    expect(s.adapter.detectCheckpoint).not.toHaveBeenCalled();
    expect(s.reports).toEqual([]);
    expect(s.sleep).not.toHaveBeenCalled();
    expect(r.skipped).toBe(2);
  });

  it("checks the kill switch right before every action and stops when it flips mid-run", async () => {
    // status calls: initial, before task1, before task2 (disabled)
    const s = setup([task(1), task(2), task(3)], { statuses: [{}, {}, { enabled: false }] });
    const r = await runChannel("LINKEDIN", s.deps);
    expect(s.adapter.sendMessage).toHaveBeenCalledTimes(1);
    expect(r.outcome).toBe("killswitch");
    // the status check for task 2 happened after the gap and before any browser action for it
    const i = s.calls.lastIndexOf("status");
    expect(s.calls.slice(i)).not.toContain("send");
  });

  it("does not act at all when the pre-action check says disabled", async () => {
    const s = setup([task(1)], { statuses: [{}, { enabled: false }] });
    await runChannel("LINKEDIN", s.deps);
    expect(s.adapter.hasSentText).not.toHaveBeenCalled();
    expect(s.adapter.sendMessage).not.toHaveBeenCalled();
  });

  it("stops if Verixa flips to dry-run mid-run", async () => {
    const s = setup([task(1), task(2)], { statuses: [{}, {}, { dryRun: true }] });
    const r = await runChannel("LINKEDIN", s.deps);
    expect(s.adapter.sendMessage).toHaveBeenCalledTimes(1);
    expect(r.outcome).toBe("killswitch");
  });

  it("halts on an adapter checkpoint: reports CHECKPOINT and runs nothing further", async () => {
    const s = setup([task(1), task(2)], { adapter: { sendMessage: vi.fn(async () => ({ status: "checkpoint", detail: "captcha" }) as AdapterResult<never>) } });
    const r = await runChannel("LINKEDIN", s.deps);
    expect(s.reports).toEqual([{ type: "CHANNEL_HALT", channel: "LINKEDIN", reason: "CHECKPOINT", detail: "captcha" }]);
    expect(s.adapter.sendMessage).toHaveBeenCalledTimes(1);
    expect(r.outcome).toBe("halted");
    expect(s.api.heartbeat).toHaveBeenCalled();
  });

  it("halts when detectCheckpoint is true before acting", async () => {
    const s = setup([task(1)], { adapter: { detectCheckpoint: vi.fn(async () => true) } });
    await runChannel("LINKEDIN", s.deps);
    expect(s.adapter.sendMessage).not.toHaveBeenCalled();
    expect(s.reports[0]).toMatchObject({ type: "CHANNEL_HALT", reason: "CHECKPOINT" });
  });

  it("halts on a checkpoint found by hasSentText", async () => {
    const s = setup([task(1)], { adapter: { hasSentText: vi.fn(async () => ({ status: "checkpoint", detail: "authwall" }) as AdapterResult<boolean>) } });
    await runChannel("LINKEDIN", s.deps);
    expect(s.adapter.sendMessage).not.toHaveBeenCalled();
    expect(s.reports[0]).toMatchObject({ type: "CHANNEL_HALT", reason: "CHECKPOINT", detail: "authwall" });
  });

  it("halts with ADAPTER_BROKEN and the screenshot path, never retrying", async () => {
    const s = setup([task(1), task(2)], { adapter: { sendMessage: vi.fn(async () => ({ status: "broken", detail: "send button missing", screenshot: ".state/shots/a.png" }) as AdapterResult<never>) } });
    const r = await runChannel("LINKEDIN", s.deps);
    expect(s.adapter.sendMessage).toHaveBeenCalledTimes(1);
    expect(r.outcome).toBe("halted");
    expect(s.reports).toHaveLength(1);
    expect(s.reports[0]).toMatchObject({ type: "CHANNEL_HALT", reason: "ADAPTER_BROKEN" });
    expect((s.reports[0] as { detail: string }).detail).toContain(".state/shots/a.png");
    expect((s.reports[0] as { detail: string }).detail).toContain("send button missing");
  });

  it("does not resend when the thread already has the text: reports SENT without sending", async () => {
    const s = setup([task(1)], { adapter: { hasSentText: vi.fn(async () => ok(true)) } });
    const r = await runChannel("LINKEDIN", s.deps);
    expect(s.adapter.sendMessage).not.toHaveBeenCalled();
    expect(s.reports).toEqual([{ type: "TOUCH_RESULT", touchId: "t1", status: "SENT" }]);
    expect(r.sent).toBe(1);
  });

  it("does not resend a touch already in the local action log", async () => {
    const state = memState();
    state.recordAction("2026-11-09", { channel: "LINKEDIN", touchId: "t1", handle: "h1", kind: "TOUCH" });
    const s = setup([task(1)], { state });
    await runChannel("LINKEDIN", s.deps);
    expect(s.adapter.sendMessage).not.toHaveBeenCalled();
    expect(s.reports).toEqual([{ type: "TOUCH_RESULT", touchId: "t1", status: "SENT" }]);
  });

  it("records the action locally before reporting", async () => {
    const state = memState();
    const s = setup([task(1)], { state });
    await runChannel("LINKEDIN", s.deps);
    expect(state.hasAction("t1")).toBe(true);
  });

  it("reports FAILED when the adapter throws and continues with the next task", async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValue(ok({ externalMessageId: "m2" }));
    const s = setup([task(1), task(2)], { adapter: { sendMessage: send } });
    const r = await runChannel("LINKEDIN", s.deps);
    expect(s.reports[0]).toMatchObject({ type: "TOUCH_RESULT", touchId: "t1", status: "FAILED", error: "boom" });
    expect(s.reports[1]).toMatchObject({ touchId: "t2", status: "SENT" });
    expect(r).toMatchObject({ sent: 1, failed: 1 });
  });

  it("truncates long error text to the schema limit", async () => {
    const s = setup([task(1)], { adapter: { sendMessage: vi.fn(async () => { throw new Error("e".repeat(900)); }) } });
    await runChannel("LINKEDIN", s.deps);
    expect((s.reports[0] as { error: string }).error.length).toBeLessThanOrEqual(500);
  });

  it("reports DMS_CLOSED and carries on", async () => {
    const send = vi.fn().mockResolvedValueOnce({ status: "dmsClosed" }).mockResolvedValue(ok({}));
    const s = setup([task(1), task(2)], { adapter: { sendMessage: send } });
    await runChannel("LINKEDIN", s.deps);
    expect(s.reports[0]).toEqual({ type: "DMS_CLOSED", leadId: "l1" });
    expect(s.reports[1]).toMatchObject({ touchId: "t2", status: "SENT" });
  });

  it("waits a random 5-13 minute gap between real actions, not before the first or after the last", async () => {
    const s = setup([task(1), task(2), task(3)]);
    await runChannel("LINKEDIN", s.deps);
    expect(s.sleep).toHaveBeenCalledTimes(2);
    expect(s.sleep).toHaveBeenCalledWith(9 * 60_000); // rng 0.5
    expect(s.calls.indexOf("sleep")).toBeGreaterThan(s.calls.indexOf("report:TOUCH_RESULT"));
  });

  it("stops when the send window closes during a gap", async () => {
    let t = new Date("2026-11-09T17:55:00Z").getTime(); // 12:55 Toronto
    const s = setup([task(1), task(2)]);
    s.deps.now = () => new Date(t);
    s.deps.sleep = vi.fn(async (ms: number) => { t += ms; });
    const r = await runChannel("LINKEDIN", s.deps);
    expect(s.adapter.sendMessage).toHaveBeenCalledTimes(1);
    expect(r.outcome).toBe("window_closed");
  });

  it("enforces a local daily action cap of 5", async () => {
    const tasks = [1, 2, 3, 4, 5, 6, 7].map((n) => task(n));
    const s = setup(tasks);
    const r = await runChannel("LINKEDIN", s.deps);
    expect(s.adapter.sendMessage).toHaveBeenCalledTimes(5);
    expect(r.outcome).toBe("completed");
  });

  it("stops the run if a SENT report cannot be delivered (the guard prevents a resend next run)", async () => {
    const s = setup([task(1), task(2)], { reportFails: true });
    const r = await runChannel("LINKEDIN", s.deps);
    expect(s.adapter.sendMessage).toHaveBeenCalledTimes(1);
    expect(r.outcome).toBe("error");
  });

  it("a rejected (non-retryable) report does not stop the run", async () => {
    const s = setup([task(1), task(2)]);
    (s.api.report as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new ApiError("touch is CANCELLED, not QUEUED", 200));
    const r = await runChannel("LINKEDIN", s.deps);
    expect(s.adapter.sendMessage).toHaveBeenCalledTimes(2);
    expect(r.outcome).toBe("completed");
  });

  it("always heartbeats, even when getTasks throws", async () => {
    const s = setup([task(1)]);
    (s.api.getTasks as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("500"));
    const r = await runChannel("LINKEDIN", s.deps);
    expect(r.outcome).toBe("error");
    expect(s.api.heartbeat).toHaveBeenCalledTimes(1);
  });

  it("a failing heartbeat does not mask the result", async () => {
    const s = setup([task(1)]);
    (s.api.heartbeat as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("down"));
    expect((await runChannel("LINKEDIN", s.deps)).outcome).toBe("completed");
  });
});
