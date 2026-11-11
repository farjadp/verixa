import { describe, expect, it } from "vitest";
import { addActiveDays, inSendWindow, isActiveDay, localParts, localTimeToUtc, startOfActiveDayAfter } from "../calendar";

const TOR = "America/Toronto";

describe("calendar", () => {
  it("reads local parts (Thu 2026-11-05 10:00 EST)", () => {
    expect(localParts(new Date("2026-11-05T15:00:00Z"), TOR)).toEqual({ ymd: "2026-11-05", weekday: 4, hour: 10, minute: 0 });
  });

  it("treats Mon–Thu as active and Fri–Sun as rest", () => {
    expect(isActiveDay(new Date("2026-11-05T15:00:00Z"), TOR)).toBe(true);  // Thu
    expect(isActiveDay(new Date("2026-11-06T15:00:00Z"), TOR)).toBe(false); // Fri
    expect(isActiveDay(new Date("2026-11-08T15:00:00Z"), TOR)).toBe(false); // Sun
  });

  it("limits the send window to 08:00–13:00 local", () => {
    expect(inSendWindow(new Date("2026-11-05T13:00:00Z"), TOR)).toBe(true);  // 08:00
    expect(inSendWindow(new Date("2026-11-05T17:59:00Z"), TOR)).toBe(true);  // 12:59
    expect(inSendWindow(new Date("2026-11-05T18:00:00Z"), TOR)).toBe(false); // 13:00
    expect(inSendWindow(new Date("2026-11-05T12:59:00Z"), TOR)).toBe(false); // 07:59
  });

  it("adds active days across the weekend", () => {
    const thu = new Date("2026-11-05T15:00:00Z");
    expect(localParts(addActiveDays(thu, 1, TOR), TOR).ymd).toBe("2026-11-09"); // Mon
    expect(localParts(addActiveDays(thu, 3, TOR), TOR).ymd).toBe("2026-11-11"); // Wed
    expect(localParts(addActiveDays(thu, 5, TOR), TOR).ymd).toBe("2026-11-16"); // next Mon
  });

  it("converts local wall time to UTC, per timezone", () => {
    expect(localTimeToUtc("2026-11-09", 8, 0, TOR).toISOString()).toBe("2026-11-09T13:00:00.000Z");
    expect(localTimeToUtc("2026-11-09", 8, 0, "America/Vancouver").toISOString()).toBe("2026-11-09T16:00:00.000Z");
    expect(localTimeToUtc("2026-07-06", 8, 0, TOR).toISOString()).toBe("2026-07-06T12:00:00.000Z"); // EDT
  });

  it("startOfActiveDayAfter returns local midnight of the n-th active day", () => {
    const thu = new Date("2026-11-05T15:00:00Z"); // Thu 10:00 EST
    expect(startOfActiveDayAfter(thu, 3, TOR).toISOString()).toBe("2026-11-11T05:00:00.000Z"); // Wed 00:00 EST
    expect(startOfActiveDayAfter(thu, 1, TOR).toISOString()).toBe("2026-11-09T05:00:00.000Z"); // Mon
    expect(startOfActiveDayAfter(thu, 3, "America/Vancouver").toISOString()).toBe("2026-11-11T08:00:00.000Z");
  });
});
