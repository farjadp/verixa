import { addMinutes, isAfter, isBefore, parse, startOfDay, addHours } from "date-fns";

export type TimeSlot = {
  start: Date;
  end: Date;
  available: boolean;
};

export function generateAvailableSlots({
  dateObj,
  durationMinutes,
  bufferMinutes,
  minimumNoticeHours,
  dayAvailability,
  existingBookings,
}: {
  dateObj: Date; // e.g. 2026-03-24T00:00:00.000Z representing the start of that day
  durationMinutes: number;
  bufferMinutes: number;
  minimumNoticeHours: number;
  dayAvailability: { startTime: string; endTime: string } | null;
  existingBookings: { scheduledStart: Date; scheduledEnd: Date }[];
}): TimeSlot[] {
  if (!dayAvailability) return []; // Not working this day

  // 1. Minimum notice check
  const now = new Date();
  const noticeDeadline = addHours(now, minimumNoticeHours);
  
  // Parse working hours for that specific date
  const workStart = parse(dayAvailability.startTime, "HH:mm", dateObj);
  const workEnd = parse(dayAvailability.endTime, "HH:mm", dateObj);

  const slots: TimeSlot[] = [];
  let currentSlotStart = workStart;

  // We loop to find valid slots
  // For simplicity, we step by `durationMinutes` or maybe 30 mins to align slots nicely.
  // Standard UX: step by 30 minutes, but check if slot fits.
  const stepMinutes = durationMinutes >= 60 ? 30 : durationMinutes;

  while (isBefore(currentSlotStart, workEnd)) {
    const currentSlotEnd = addMinutes(currentSlotStart, durationMinutes);

    // If this slot extends past the working day, stop
    if (isAfter(currentSlotEnd, workEnd)) {
      break;
    }

    // Check minimum notice
    if (isBefore(currentSlotStart, noticeDeadline)) {
      currentSlotStart = addMinutes(currentSlotStart, stepMinutes);
      continue;
    }

    // Check overlaps with existing bookings, including buffer
    let hasConflict = false;
    for (const booking of existingBookings) {
      // The booked time + buffer
      const bufferedBookingStart = addMinutes(booking.scheduledStart, -bufferMinutes);
      const bufferedBookingEnd = addMinutes(booking.scheduledEnd, bufferMinutes);

      // Slot intersects if:
      // slot starts before booking ends AND slot ends after booking starts
      if (
        isBefore(currentSlotStart, bufferedBookingEnd) &&
        isAfter(currentSlotEnd, bufferedBookingStart)
      ) {
        hasConflict = true;
        break;
      }
    }

    if (!hasConflict) {
      slots.push({
        start: currentSlotStart,
        end: currentSlotEnd,
        available: true,
      });
    }

    currentSlotStart = addMinutes(currentSlotStart, stepMinutes);
  }

  return slots;
}
