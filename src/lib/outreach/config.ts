import type { Step } from "./types";

/** Every cadence number lives here. Values come from the spec (Fibonacci). */
export const OUTREACH = {
  activeWeekdays: [1, 2, 3, 4] as readonly number[], // Mon–Thu; 0 = Sunday
  newLeadsPerChannelPerDay: 8,
  touchesPerChannelPerDay: 5,
  maxTouchesPerPerson: 3,
  waitActiveDaysAfterTouch: { 1: 3, 2: 5, 3: 5 } as Record<Step, number>,
  autoReplyDelayActiveDays: 3,
  backlogExpiryDays: 34,
  cooldownDays: 89,
  inviteExpiryDays: 21,
  sendWindow: { startHour: 8, endHour: 13 },
  gapMinutes: { min: 5, max: 13 },
  discoverySampleSize: 89,
  minMatchConfidence: 0.8,
  operatorTimezone: "America/Toronto",
  autoPause: { windowDays: 7, minTouches: 13, maxNegativeRate: 0.08 },
  heartbeatStaleHours: 24,
  classifierMinConfidence: 0.7,
  linkedinInviteNoteMax: 300,
} as const;
