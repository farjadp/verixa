import { describe, expect, it } from "vitest";
import { inSendWindow, isActiveDay, randomGapMs } from "./timing";

const TZ = "America/Toronto";
// 2026-11-09 is a Monday. November is EST (UTC-5).
const at = (iso: string) => new Date(iso);

describe("send window", () => {
  it("is open 08:00 inclusive to 13:00 exclusive Toronto time on Mon-Thu", () => {
    expect(inSendWindow(at("2026-11-09T12:59:00Z"), TZ)).toBe(false); // 07:59 local
    expect(inSendWindow(at("2026-11-09T13:00:00Z"), TZ)).toBe(true); // 08:00
    expect(inSendWindow(at("2026-11-09T17:59:00Z"), TZ)).toBe(true); // 12:59
    expect(inSendWindow(at("2026-11-09T18:00:00Z"), TZ)).toBe(false); // 13:00
  });

  it("is closed Friday to Sunday", () => {
    expect(inSendWindow(at("2026-11-12T15:00:00Z"), TZ)).toBe(true); // Thu
    expect(inSendWindow(at("2026-11-13T15:00:00Z"), TZ)).toBe(false); // Fri
    expect(inSendWindow(at("2026-11-14T15:00:00Z"), TZ)).toBe(false); // Sat
    expect(inSendWindow(at("2026-11-15T15:00:00Z"), TZ)).toBe(false); // Sun
  });

  it("uses the local day, not the UTC day", () => {
    // Thu 2026-11-12 23:30 Toronto = Fri 04:30Z: still Thursday locally, but outside hours.
    expect(isActiveDay(at("2026-11-13T04:30:00Z"), TZ)).toBe(true);
    // Mon 2026-11-09 00:30 Toronto = 05:30Z Monday; Sun 23:30 Toronto = Mon 04:30Z is Sunday locally.
    expect(isActiveDay(at("2026-11-09T04:30:00Z"), TZ)).toBe(false);
  });

  it("follows DST (EDT, UTC-4)", () => {
    // Mon 2026-06-08 08:00 EDT = 12:00Z
    expect(inSendWindow(at("2026-06-08T12:00:00Z"), TZ)).toBe(true);
    expect(inSendWindow(at("2026-06-08T11:59:00Z"), TZ)).toBe(false);
  });
});

describe("randomGapMs", () => {
  it("maps rng 0..1 onto 5..13 minutes", () => {
    expect(randomGapMs(() => 0)).toBe(5 * 60_000);
    expect(randomGapMs(() => 0.5)).toBe(9 * 60_000);
    expect(randomGapMs(() => 0.999999)).toBeLessThanOrEqual(13 * 60_000);
    expect(randomGapMs(() => 0.999999)).toBeGreaterThan(12.9 * 60_000);
  });
});
