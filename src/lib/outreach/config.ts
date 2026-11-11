import type { Step } from "./types";

/** Every cadence number lives here. Values come from the spec (Fibonacci). */
export const OUTREACH = {
  activeWeekdays: [1, 2, 3, 4] as readonly number[], // Mon–Thu; 0 = Sunday
  newLeadsPerChannelPerDay: 8,
  touchesPerChannelPerDay: 5,
  maxTouchesPerPerson: 3,
  waitActiveDaysAfterTouch: { 1: 3, 2: 5, 3: 5 } as Record<Step, number>,
  autoReplyDelayActiveDays: 3,
  inviteAcceptedNextTouchActiveDays: 1,
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
  /** Email follow-ups (step >= 2) are held unless the worker read the inbox within this many active days. */
  inboxReadMaxActiveDays: 2,
  classifierMinConfidence: 0.7,
  /** An LLM auto_reply label is trusted only at this confidence, unless the mail had an auto-reply header. */
  autoReplyMinConfidence: 0.9,
  linkedinInviteNoteMax: 300,
} as const;

/** Outreach must not run while founder alerts would be dropped: they carry opt-outs, halts and send failures. */
export function isAlertConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.OUTREACH_ALERT_EMAIL?.trim());
}

export const ALERT_UNSET_MESSAGE = "OUTREACH_ALERT_EMAIL is unset; outreach is treated as disabled so alerts are not silently dropped.";
