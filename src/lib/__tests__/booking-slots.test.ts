import { describe, it, expect } from "vitest";
import { generateAvailableSlots } from "@/lib/booking-utils";
import {
  zonedTimeToUtc,
  dayOfWeekForDate,
  dateStringInTimeZone,
  zonedDayBounds,
  addDaysToDateString,
  safeTimeZone,
  formatInTimeZone,
} from "@/lib/timezone";

const TORONTO = "America/Toronto";
const VANCOUVER = "America/Vancouver";

describe("timezone helpers", () => {
  it("converts Toronto wall time to UTC in winter (EST, -5)", () => {
    expect(zonedTimeToUtc("2026-12-01", "09:00", TORONTO).toISOString()).toBe("2026-12-01T14:00:00.000Z");
  });

  it("converts Toronto wall time to UTC in summer (EDT, -4)", () => {
    expect(zonedTimeToUtc("2026-07-01", "09:00", TORONTO).toISOString()).toBe("2026-07-01T13:00:00.000Z");
  });

  it("handles the spring-forward gap without throwing", () => {
    // 2026-03-08 02:30 does not exist in Toronto; lands after the gap.
    const d = zonedTimeToUtc("2026-03-08", "02:30", TORONTO);
    expect(d.toISOString()).toBe("2026-03-08T07:30:00.000Z");
  });

  it("gives the calendar day of week regardless of server timezone", () => {
    expect(dayOfWeekForDate("2026-11-09")).toBe(1); // Monday
    expect(dayOfWeekForDate("2026-11-08")).toBe(0); // Sunday
  });

  it("reads the local calendar date of an instant", () => {
    // 03:00 UTC on the 10th is still the 9th in Vancouver.
    expect(dateStringInTimeZone(new Date("2026-11-10T03:00:00Z"), VANCOUVER)).toBe("2026-11-09");
  });

  it("computes day bounds across a DST change (fall back = 25h day)", () => {
    const { start, end } = zonedDayBounds("2026-11-01", TORONTO);
    expect((end.getTime() - start.getTime()) / 3_600_000).toBe(25);
  });

  it("adds days across month ends", () => {
    expect(addDaysToDateString("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("falls back to Toronto for invalid zones", () => {
    expect(safeTimeZone("Mars/Base")).toBe(TORONTO);
    expect(safeTimeZone(VANCOUVER)).toBe(VANCOUVER);
  });

  it("formats with the zone abbreviation", () => {
    expect(formatInTimeZone(new Date("2026-12-01T14:00:00Z"), TORONTO)).toMatch(/9:00.*EST/);
  });

  it("rejects malformed input", () => {
    expect(() => zonedTimeToUtc("2026-02-30", "09:00", TORONTO)).toThrow();
    expect(() => zonedTimeToUtc("2026-02-01", "25:00", TORONTO)).toThrow();
  });
});

describe("generateAvailableSlots", () => {
  const base = {
    dateStr: "2026-12-07", // Monday
    timeZone: TORONTO,
    durationMinutes: 60,
    bufferMinutes: 0,
    minimumNoticeHours: 0,
    dayAvailability: { startTime: "09:00", endTime: "12:00" },
    existingBookings: [] as { scheduledStart: Date; scheduledEnd: Date }[],
    now: new Date("2026-12-01T12:00:00Z"),
  };

  it("generates slots in the consultant's timezone, not the server's", () => {
    const slots = generateAvailableSlots(base);
    expect(slots[0].start.toISOString()).toBe("2026-12-07T14:00:00.000Z"); // 9:00 EST
    expect(slots.at(-1)!.end.toISOString()).toBe("2026-12-07T17:00:00.000Z"); // 12:00 EST
    expect(slots).toHaveLength(5); // 9:00, 9:30, 10:00, 10:30, 11:00
  });

  it("returns nothing on a day off", () => {
    expect(generateAvailableSlots({ ...base, dayAvailability: null })).toEqual([]);
  });

  it("removes slots that overlap a booking plus its buffer", () => {
    const slots = generateAvailableSlots({
      ...base,
      bufferMinutes: 15,
      existingBookings: [{ scheduledStart: new Date("2026-12-07T15:00:00Z"), scheduledEnd: new Date("2026-12-07T16:00:00Z") }],
    });
    // Booked 10:00–11:00 EST, buffered 9:45–11:15: only nothing fits before (9:00–10:00 ends after 9:45),
    // and 11:00 starts inside the buffer → no slot survives.
    expect(slots.map((s) => s.start.toISOString())).toEqual([]);
  });

  it("respects the minimum notice period", () => {
    const slots = generateAvailableSlots({ ...base, now: new Date("2026-12-07T13:00:00Z"), minimumNoticeHours: 2 });
    // now 8:00 EST + 2h → first slot at 10:00 EST
    expect(slots[0].start.toISOString()).toBe("2026-12-07T15:00:00.000Z");
  });

  it("enforces maxBookingsPerDay", () => {
    expect(generateAvailableSlots({ ...base, maxBookingsPerDay: 2, bookingsOnDay: 2 })).toEqual([]);
    expect(generateAvailableSlots({ ...base, maxBookingsPerDay: 2, bookingsOnDay: 1 }).length).toBeGreaterThan(0);
  });

  it("enforces the booking window", () => {
    expect(generateAvailableSlots({ ...base, bookingWindowDays: 3 })).toEqual([]); // Dec 7 > Dec 1 + 3
    expect(generateAvailableSlots({ ...base, bookingWindowDays: 6 }).length).toBeGreaterThan(0);
  });

  it("steps by the duration for short sessions", () => {
    const slots = generateAvailableSlots({ ...base, durationMinutes: 45, dayAvailability: { startTime: "09:00", endTime: "11:00" } });
    expect(slots).toHaveLength(2); // 9:00, 9:45 (10:30 would end at 11:15)
  });
});
