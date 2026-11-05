import { addMinutes, addHours } from "date-fns";
import { addDaysToDateString, dateStringInTimeZone, zonedTimeToUtc } from "@/lib/timezone";

export type TimeSlot = {
  start: Date;
  end: Date;
  available: boolean;
};

export type SlotInput = {
  /** Calendar date in the consultant's timezone, YYYY-MM-DD. */
  dateStr: string;
  /** Consultant's IANA timezone; availability times are wall-clock in this zone. */
  timeZone: string;
  durationMinutes: number;
  bufferMinutes: number;
  minimumNoticeHours: number;
  dayAvailability: { startTime: string; endTime: string } | null;
  existingBookings: { scheduledStart: Date; scheduledEnd: Date }[];
  /** null/undefined = unlimited. */
  maxBookingsPerDay?: number | null;
  /** Active bookings already on this day; defaults to existingBookings.length. */
  bookingsOnDay?: number;
  /** null/undefined = unlimited. Dates beyond today + N days get no slots. */
  bookingWindowDays?: number | null;
  now?: Date;
};

export function generateAvailableSlots(input: SlotInput): TimeSlot[] {
  const {
    dateStr,
    timeZone,
    durationMinutes,
    bufferMinutes,
    minimumNoticeHours,
    dayAvailability,
    existingBookings,
    maxBookingsPerDay,
    bookingWindowDays,
  } = input;
  const bookingsOnDay = input.bookingsOnDay ?? existingBookings.length;
  const now = input.now ?? new Date();

  if (!dayAvailability) return []; // Not working this day
  if (durationMinutes <= 0) return [];

  if (maxBookingsPerDay != null && maxBookingsPerDay > 0 && bookingsOnDay >= maxBookingsPerDay) {
    return [];
  }

  if (bookingWindowDays != null && bookingWindowDays > 0) {
    const lastBookableDate = addDaysToDateString(dateStringInTimeZone(now, timeZone), bookingWindowDays);
    if (dateStr > lastBookableDate) return [];
  }

  const noticeDeadline = addHours(now, Math.max(0, minimumNoticeHours));
  const workStart = zonedTimeToUtc(dateStr, dayAvailability.startTime, timeZone);
  const workEnd = zonedTimeToUtc(dateStr, dayAvailability.endTime, timeZone);

  // Step by 30 minutes for long sessions so start times stay on the half hour.
  const stepMinutes = durationMinutes >= 60 ? 30 : durationMinutes;
  const slots: TimeSlot[] = [];

  for (let start = workStart; start < workEnd; start = addMinutes(start, stepMinutes)) {
    const end = addMinutes(start, durationMinutes);
    if (end > workEnd) break;
    if (start < noticeDeadline) continue;

    const conflict = existingBookings.some((b) => {
      const bufferedStart = addMinutes(b.scheduledStart, -bufferMinutes);
      const bufferedEnd = addMinutes(b.scheduledEnd, bufferMinutes);
      return start < bufferedEnd && end > bufferedStart;
    });
    if (!conflict) slots.push({ start, end, available: true });
  }

  return slots;
}
