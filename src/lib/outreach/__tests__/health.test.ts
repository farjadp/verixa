import { describe, expect, it } from "vitest";
import { checkHealth } from "../health";

const on = { enabled: true, dryRun: false, channels: { LINKEDIN: true, X: false, EMAIL: true } };
const thu = new Date("2026-11-05T15:00:00Z");

describe("checkHealth", () => {
  it("alerts on a stale heartbeat on active days when a social channel is on", () => {
    const r = checkHealth({ now: thu, settings: on, heartbeat: new Date("2026-11-04T10:00:00Z"), stats: { touches: 0, negatives: 0 } });
    expect(r.alerts[0]).toMatch(/heartbeat/i);
    expect(r.pause).toBe(false);
  });

  it("stays quiet on rest days and when social channels are off", () => {
    expect(checkHealth({ now: new Date("2026-11-07T15:00:00Z"), settings: on, heartbeat: null, stats: { touches: 0, negatives: 0 } }).alerts).toEqual([]);
    expect(checkHealth({ now: thu, settings: { ...on, channels: { LINKEDIN: false, X: false, EMAIL: true } }, heartbeat: null, stats: { touches: 0, negatives: 0 } }).alerts).toEqual([]);
  });

  it("auto-pauses above 8% negatives with at least 13 touches", () => {
    const fresh = new Date("2026-11-05T14:00:00Z");
    expect(checkHealth({ now: thu, settings: on, heartbeat: fresh, stats: { touches: 13, negatives: 2 } }).pause).toBe(true);
    expect(checkHealth({ now: thu, settings: on, heartbeat: fresh, stats: { touches: 13, negatives: 1 } }).pause).toBe(false);
    expect(checkHealth({ now: thu, settings: on, heartbeat: fresh, stats: { touches: 8, negatives: 5 } }).pause).toBe(false);
  });
});
