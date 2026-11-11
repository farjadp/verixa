import { describe, expect, it, vi } from "vitest";
import type { AdapterResult } from "../adapters/types";
import type { SocialProfile } from "../match";
import { candidate, type FakeApiOpts, fakeAdapter, fakeApi, MONDAY_9AM, ok, SATURDAY } from "../testkit";
import { discoverChannel, type DiscoverDeps } from "./discover";

const good: SocialProfile = { handle: "josea", name: "Jose Alvarez", headline: "RCIC | Immigration Consultant", location: "Toronto" };

function setup(over: { adapter?: Parameters<typeof fakeAdapter>[1]; status?: FakeApiOpts["status"]; now?: Date } = {}) {
  const { api, reports } = fakeApi({ status: over.status });
  const adapter = fakeAdapter("LINKEDIN", over.adapter);
  const sleep = vi.fn(async (_ms: number) => {});
  const deps: DiscoverDeps = { api, adapter, now: () => over.now ?? MONDAY_9AM, sleep, rng: () => 0.5, tz: "America/Toronto", log: () => {} };
  return { deps, api, adapter, reports, sleep };
}

describe("discoverChannel", () => {
  it("reports LEAD_MATCHED only for a confident single match", async () => {
    const s = setup({ adapter: { findProfile: vi.fn(async () => ok([good, { handle: "other", name: "Other Person", headline: "RCIC" }])) } });
    const r = await discoverChannel("LINKEDIN", [candidate(1)], s.deps);
    expect(r).toMatchObject({ outcome: "completed", searched: 1, matched: 1 });
    expect(s.reports).toHaveLength(1);
    expect(s.reports[0]).toMatchObject({ type: "LEAD_MATCHED", consultantProfileId: "c1", channel: "LINKEDIN", handle: "josea", timezone: "America/Toronto" });
    expect((s.reports[0] as { matchConfidence: number }).matchConfidence).toBeGreaterThanOrEqual(0.8);
  });

  it("reports nothing for weak or ambiguous matches", async () => {
    const weak = setup({ adapter: { findProfile: vi.fn(async () => ok([{ handle: "x", name: "Jose Alvarez", headline: "Dentist" }])) } });
    await discoverChannel("LINKEDIN", [candidate(1)], weak.deps);
    expect(weak.reports).toEqual([]);
    const ambiguous = setup({ adapter: { findProfile: vi.fn(async () => ok([good, { ...good, handle: "twin" }])) } });
    await discoverChannel("LINKEDIN", [candidate(1)], ambiguous.deps);
    expect(ambiguous.reports).toEqual([]);
  });

  it("derives signals conservatively (unknowns false)", async () => {
    const s = setup({ adapter: { findProfile: vi.fn(async () => ok([good])) } });
    await discoverChannel("LINKEDIN", [candidate(1)], s.deps);
    expect((s.reports[0] as { signals: unknown }).signals).toEqual({ postedAboutMarketing: false, soloOrSmallFirm: false, activeLast21Days: false, socialProfileComplete: false, hadProfileViews30d: false });
  });

  it("checks the kill switch before every search and stops when it flips", async () => {
    const s = setup({ status: [{}, { enabled: false }] });
    const r = await discoverChannel("LINKEDIN", [candidate(1), candidate(2), candidate(3)], s.deps);
    expect(s.adapter.findProfile).toHaveBeenCalledTimes(1);
    expect(r.outcome).toBe("killswitch");
  });

  it("does not search when disabled from the start", async () => {
    const s = setup({ status: { enabled: false } });
    expect((await discoverChannel("LINKEDIN", [candidate(1)], s.deps)).outcome).toBe("killswitch");
    expect(s.adapter.findProfile).not.toHaveBeenCalled();
  });

  it("still searches in dry-run (matching is read-only)", async () => {
    const s = setup({ status: { dryRun: true }, adapter: { findProfile: vi.fn(async () => ok([good])) } });
    await discoverChannel("LINKEDIN", [candidate(1)], s.deps);
    expect(s.reports).toHaveLength(1);
  });

  it("stays out of the browser outside the send window", async () => {
    const s = setup({ now: SATURDAY });
    expect((await discoverChannel("LINKEDIN", [candidate(1)], s.deps)).outcome).toBe("window_closed");
    expect(s.adapter.findProfile).not.toHaveBeenCalled();
  });

  it("halts on a checkpoint from a search", async () => {
    const s = setup({ adapter: { findProfile: vi.fn(async () => ({ status: "checkpoint", detail: "authwall" }) as AdapterResult<never>) } });
    const r = await discoverChannel("LINKEDIN", [candidate(1), candidate(2)], s.deps);
    expect(r.outcome).toBe("halted");
    expect(s.adapter.findProfile).toHaveBeenCalledTimes(1);
    expect(s.reports).toEqual([{ type: "CHANNEL_HALT", channel: "LINKEDIN", reason: "CHECKPOINT", detail: "authwall" }]);
  });

  it("halts ADAPTER_BROKEN with the screenshot", async () => {
    const s = setup({ adapter: { findProfile: vi.fn(async () => ({ status: "broken", detail: "no results region", screenshot: "a.png" }) as AdapterResult<never>) } });
    await discoverChannel("LINKEDIN", [candidate(1)], s.deps);
    expect(s.reports[0]).toMatchObject({ type: "CHANNEL_HALT", reason: "ADAPTER_BROKEN" });
    expect((s.reports[0] as { detail: string }).detail).toContain("a.png");
  });

  it("halts on a pre-search checkpoint", async () => {
    const s = setup({ adapter: { detectCheckpoint: vi.fn(async () => true) } });
    await discoverChannel("LINKEDIN", [candidate(1)], s.deps);
    expect(s.adapter.findProfile).not.toHaveBeenCalled();
    expect(s.reports[0]).toMatchObject({ reason: "CHECKPOINT" });
  });

  it("pauses between searches only", async () => {
    const s = setup();
    await discoverChannel("LINKEDIN", [candidate(1), candidate(2), candidate(3)], s.deps);
    expect(s.sleep).toHaveBeenCalledTimes(2);
    const ms = s.sleep.mock.calls[0][0];
    expect(ms).toBeGreaterThanOrEqual(3000);
    expect(ms).toBeLessThanOrEqual(9000);
  });

  it("a thrown search error skips that candidate and continues", async () => {
    const find = vi.fn().mockRejectedValueOnce(new Error("flaky")).mockResolvedValue(ok([good]));
    const s = setup({ adapter: { findProfile: find } });
    const r = await discoverChannel("LINKEDIN", [candidate(1), candidate(2)], s.deps);
    expect(r).toMatchObject({ searched: 2, matched: 1, outcome: "completed" });
  });

  it("stops with error if a report cannot be delivered", async () => {
    const s = setup({ adapter: { findProfile: vi.fn(async () => ok([good])) } });
    (s.api.report as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("net"));
    const r = await discoverChannel("LINKEDIN", [candidate(1), candidate(2)], s.deps);
    expect(r.outcome).toBe("error");
    expect(s.adapter.findProfile).toHaveBeenCalledTimes(1);
  });
});
