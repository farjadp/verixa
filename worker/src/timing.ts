// Mirrors OUTREACH in src/lib/outreach/config.ts (spec section 2): Mon-Thu, 08:00-13:00 operator time, 5-13 min gaps.
export const SEND_WINDOW = { startHour: 8, endHour: 13 } as const;
export const ACTIVE_WEEKDAYS: readonly number[] = [1, 2, 3, 4]; // 0 = Sunday
export const GAP_MINUTES = { min: 5, max: 13 } as const;

export type Sleep = (ms: number) => Promise<void>;
export const realSleep: Sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function localParts(now: Date, tz: string): { weekday: number; hour: number; ymd: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, weekday: "short", hour: "2-digit", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { weekday: WEEKDAYS.indexOf(get("weekday")), hour: Number(get("hour")), ymd: `${get("year")}-${get("month")}-${get("day")}` };
}

export function isActiveDay(now: Date, tz: string): boolean {
  return ACTIVE_WEEKDAYS.includes(localParts(now, tz).weekday);
}

export function inSendWindow(now: Date, tz: string): boolean {
  const { weekday, hour } = localParts(now, tz);
  return ACTIVE_WEEKDAYS.includes(weekday) && hour >= SEND_WINDOW.startHour && hour < SEND_WINDOW.endHour;
}

/** Local calendar day (YYYY-MM-DD) in the operator timezone, used to key the per-day action log. */
export function localDay(now: Date, tz: string): string {
  return localParts(now, tz).ymd;
}

export function randomGapMs(rng: () => number): number {
  const { min, max } = GAP_MINUTES;
  return Math.round((min + rng() * (max - min)) * 60_000);
}
