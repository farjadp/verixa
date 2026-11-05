// Timezone helpers built on Intl (no extra dependency).
// Availability is stored as wall-clock times ("09:00") in the consultant's
// IANA timezone; bookings are stored as UTC instants. These helpers convert
// between the two so slot generation does not depend on the server's TZ.

export const DEFAULT_TIMEZONE = "America/Toronto";

export function isValidTimeZone(tz: string | null | undefined): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function safeTimeZone(tz: string | null | undefined): string {
  return isValidTimeZone(tz) ? tz : DEFAULT_TIMEZONE;
}

/** Offset (ms) of `timeZone` from UTC at the given instant. Toronto in winter → -5h. */
export function timeZoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  // Drop milliseconds from the instant: formatToParts has second precision.
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseDateString(dateStr: string): { y: number; m: number; d: number } | null {
  const match = DATE_RE.exec(dateStr);
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  return { y, m, d };
}

/**
 * The UTC instant for a wall-clock time on a calendar date in `timeZone`.
 * During a DST gap (e.g. 02:30 on spring-forward day) the result lands just
 * after the gap, which is what a calendar would show.
 */
export function zonedTimeToUtc(dateStr: string, time: string, timeZone: string): Date {
  const date = parseDateString(dateStr);
  const t = TIME_RE.exec(time);
  if (!date || !t) throw new Error(`Invalid date/time: ${dateStr} ${time}`);
  const wallAsUtc = Date.UTC(date.y, date.m - 1, date.d, Number(t[1]), Number(t[2]));
  let guess = wallAsUtc - timeZoneOffsetMs(new Date(wallAsUtc), timeZone);
  const second = wallAsUtc - timeZoneOffsetMs(new Date(guess), timeZone);
  // Take the corrected instant only if it really shows the requested wall time;
  // inside a DST gap it doesn't, and the first guess (just after the gap) wins.
  if (second !== guess && second + timeZoneOffsetMs(new Date(second), timeZone) === wallAsUtc) guess = second;
  return new Date(guess);
}

/** Day of week (0 = Sunday) for a YYYY-MM-DD calendar date, independent of any timezone. */
export function dayOfWeekForDate(dateStr: string): number {
  const date = parseDateString(dateStr);
  if (!date) throw new Error(`Invalid date: ${dateStr}`);
  return new Date(Date.UTC(date.y, date.m - 1, date.d)).getUTCDay();
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const date = parseDateString(dateStr);
  if (!date) throw new Error(`Invalid date: ${dateStr}`);
  return new Date(Date.UTC(date.y, date.m - 1, date.d + days)).toISOString().slice(0, 10);
}

/** YYYY-MM-DD of an instant as seen in `timeZone`. */
export function dateStringInTimeZone(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** UTC bounds [start, end) of a calendar day in `timeZone`. */
export function zonedDayBounds(dateStr: string, timeZone: string): { start: Date; end: Date } {
  return {
    start: zonedTimeToUtc(dateStr, "00:00", timeZone),
    end: zonedTimeToUtc(addDaysToDateString(dateStr, 1), "00:00", timeZone),
  };
}

/** Human-readable time in a timezone, with its abbreviation: "Tue, Nov 10, 2026, 9:00 AM EST". */
export function formatInTimeZone(instant: Date | string, timeZone: string, opts?: { dateOnly?: boolean }): string {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: safeTimeZone(timeZone),
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(opts?.dateOnly ? {} : { hour: "numeric", minute: "2-digit", timeZoneName: "short" }),
  }).format(date);
}
