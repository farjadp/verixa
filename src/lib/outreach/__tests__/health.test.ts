import { describe, expect, it } from "vitest";
import { checkHealth, isInboxReadStale } from "../health";

const on = { enabled: true, dryRun: false, channels: { LINKEDIN: true, X: false, EMAIL: true } };
const thu = new Date("2026-11-05T15:00:00Z");
const readToday = new Date("2026-11-05T14:00:00Z");
const noStats = { touches: 0, negatives: 0 };

describe("checkHealth", () => {
  it("alerts on a stale heartbeat on active days when a social channel is on", () => {
    const r = checkHealth({ now: thu, settings: on, heartbeat: new Date("2026-11-04T10:00:00Z"), stats: noStats, inboxReadAt: readToday });
    expect(r.alerts[0]).toMatch(/heartbeat/i);
    expect(r.pause).toBe(false);
  });

  it("does not alert on a Monday even with a 4-day-old heartbeat, but does on Tuesday with a 30h-old one", () => {
    const mon = new Date("2026-11-09T10:00:00Z");
    expect(checkHealth({ now: mon, settings: on, heartbeat: new Date("2026-11-05T15:00:00Z"), stats: noStats, inboxReadAt: readToday }).alerts).toEqual([]);
    const tue = new Date("2026-11-10T10:00:00Z");
    const r = checkHealth({ now: tue, settings: on, heartbeat: new Date("2026-11-09T04:00:00Z"), stats: noStats, inboxReadAt: readToday });
    expect(r.alerts[0]).toMatch(/heartbeat/i);
  });

  it("stays quiet on rest days, when outreach is off, and when every channel is off", () => {
    expect(checkHealth({ now: new Date("2026-11-07T15:00:00Z"), settings: on, heartbeat: null, stats: noStats, inboxReadAt: readToday }).alerts).toEqual([]);
    expect(checkHealth({ now: thu, settings: { ...on, enabled: false }, heartbeat: null, stats: noStats, inboxReadAt: null }).alerts).toEqual([]);
    expect(checkHealth({ now: thu, settings: { ...on, channels: { LINKEDIN: false, X: false, EMAIL: false } }, heartbeat: null, stats: noStats, inboxReadAt: null }).alerts).toEqual([]);
  });

  it("alerts on a stale heartbeat when only EMAIL is on", () => {
    const emailOnly = { ...on, channels: { LINKEDIN: false, X: false, EMAIL: true } };
    const r = checkHealth({ now: thu, settings: emailOnly, heartbeat: null, stats: noStats, inboxReadAt: readToday });
    expect(r.alerts).toHaveLength(1);
    expect(r.alerts[0]).toMatch(/heartbeat/i);
  });

  it("keeps the both-days-active rule for an email-only setup", () => {
    const emailOnly = { ...on, channels: { LINKEDIN: false, X: false, EMAIL: true } };
    const mon = new Date("2026-11-09T10:00:00Z");
    expect(checkHealth({ now: mon, settings: emailOnly, heartbeat: new Date("2026-11-05T15:00:00Z"), stats: noStats, inboxReadAt: new Date("2026-11-05T15:00:00Z") }).alerts).toEqual([]);
  });

  it("says email follow-ups are held when the inbox has not been read within 2 active days", () => {
    const fresh = new Date("2026-11-05T14:00:00Z");
    const never = checkHealth({ now: thu, settings: on, heartbeat: fresh, stats: noStats, inboxReadAt: null });
    expect(never.alerts).toEqual(["Email follow-ups held: inbox not read since never. Check IMAP on the Mac worker."]);
    const old = new Date("2026-11-02T15:00:00Z"); // Mon; Thu is 3 active days later
    expect(checkHealth({ now: thu, settings: on, heartbeat: fresh, stats: noStats, inboxReadAt: old }).alerts)
      .toEqual([`Email follow-ups held: inbox not read since ${old.toISOString()}. Check IMAP on the Mac worker.`]);
    expect(checkHealth({ now: thu, settings: on, heartbeat: fresh, stats: noStats, inboxReadAt: new Date("2026-11-04T15:00:00Z") }).alerts).toEqual([]);
  });

  it("does not mention held follow-ups when EMAIL is off", () => {
    const socialOnly = { ...on, channels: { LINKEDIN: true, X: false, EMAIL: false } };
    expect(checkHealth({ now: thu, settings: socialOnly, heartbeat: readToday, stats: noStats, inboxReadAt: null }).alerts).toEqual([]);
  });

  it("auto-pauses above 8% negatives with at least 13 touches", () => {
    const fresh = new Date("2026-11-05T14:00:00Z");
    expect(checkHealth({ now: thu, settings: on, heartbeat: fresh, stats: { touches: 13, negatives: 2 }, inboxReadAt: readToday }).pause).toBe(true);
    expect(checkHealth({ now: thu, settings: on, heartbeat: fresh, stats: { touches: 13, negatives: 1 }, inboxReadAt: readToday }).pause).toBe(false);
    expect(checkHealth({ now: thu, settings: on, heartbeat: fresh, stats: { touches: 8, negatives: 5 }, inboxReadAt: readToday }).pause).toBe(false);
  });
});

describe("isInboxReadStale", () => {
  it("is stale when never read or older than 2 active days, counting across the weekend", () => {
    expect(isInboxReadStale(null, thu)).toBe(true);
    expect(isInboxReadStale(new Date("2026-11-03T15:00:00Z"), thu)).toBe(false); // Tue -> Thu: 2 active days
    expect(isInboxReadStale(new Date("2026-11-03T14:59:00Z"), thu)).toBe(true);
    // Read Thu, checked the next Tuesday morning: Mon + Tue = 2 active days, still fresh before Thu's time of day.
    expect(isInboxReadStale(new Date("2026-11-05T15:00:00Z"), new Date("2026-11-10T11:00:00Z"))).toBe(false);
    expect(isInboxReadStale(new Date("2026-11-05T15:00:00Z"), new Date("2026-11-11T11:00:00Z"))).toBe(true);
  });
});
