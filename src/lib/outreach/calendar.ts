import { OUTREACH } from "./config";

const DAY_MS = 86_400_000;
const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(tz: string): Intl.DateTimeFormat {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23",
    });
    formatters.set(tz, f);
  }
  return f;
}

function parts(d: Date, tz: string) {
  const p: Record<string, string> = {};
  for (const { type, value } of formatter(tz).formatToParts(d)) p[type] = value;
  return { year: +p.year, month: +p.month, day: +p.day, hour: +p.hour, minute: +p.minute, weekday: WEEKDAYS[p.weekday] };
}

export function localParts(d: Date, tz: string) {
  const p = parts(d, tz);
  const ymd = `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
  return { ymd, weekday: p.weekday, hour: p.hour, minute: p.minute };
}

export function isActiveDay(d: Date, tz: string): boolean {
  return OUTREACH.activeWeekdays.includes(localParts(d, tz).weekday);
}

export function inSendWindow(d: Date, tz: string): boolean {
  const { hour } = localParts(d, tz);
  return isActiveDay(d, tz) && hour >= OUTREACH.sendWindow.startHour && hour < OUTREACH.sendWindow.endHour;
}

export function addCalendarDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS);
}

/** Moves forward one calendar day at a time until `n` active days have been counted. */
export function addActiveDays(d: Date, n: number, tz: string): Date {
  let cur = d;
  let counted = 0;
  while (counted < n) {
    cur = addCalendarDays(cur, 1);
    if (isActiveDay(cur, tz)) counted++;
  }
  return cur;
}

function offsetMs(d: Date, tz: string): number {
  const p = parts(d, tz);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - Math.floor(d.getTime() / 60_000) * 60_000;
}

/** UTC instant for a wall-clock time in `tz`. Two passes settle DST edges. */
export function localTimeToUtc(ymd: string, hour: number, minute: number, tz: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const naive = Date.UTC(y, m - 1, d, hour, minute);
  let guess = naive - offsetMs(new Date(naive), tz);
  guess = naive - offsetMs(new Date(guess), tz);
  return new Date(guess);
}
