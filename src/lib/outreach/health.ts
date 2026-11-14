import { addActiveDays, addCalendarDays, isActiveDay } from "./calendar";
import { OUTREACH } from "./config";
import type { Finding } from "./diagnosis";
import type { OutreachSettings } from "./settings";

/**
 * True when the worker has not read the inbox successfully within the last `inboxReadMaxActiveDays` active days
 * (operator timezone). Email follow-ups are held then, since a reply we have not seen could be an opt-out.
 */
export function isInboxReadStale(inboxReadAt: Date | null, now: Date): boolean {
  if (!inboxReadAt) return true;
  return addActiveDays(inboxReadAt, OUTREACH.inboxReadMaxActiveDays, OUTREACH.operatorTimezone).getTime() < now.getTime();
}

export function heldFollowUpsLine(inboxReadAt: Date | null): string {
  return `Email follow-ups held: inbox not read since ${inboxReadAt?.toISOString() ?? "never"}. Check IMAP on the Mac worker.`;
}

/** One alert line per finding: what is wrong, then what to do. */
export const findingLine = (f: Finding) => `[${f.severity.toUpperCase()}] ${f.title}. ${f.finding} Fix: ${f.fix}`;

/**
 * Daily health check. `findings` come from diagnose() (diagnosis.ts): warn/critical ones become alert lines,
 * and a finding with `pause` auto-pauses outreach exactly like the negative-reply rate does.
 */
export function checkHealth({ now, settings, heartbeat, stats, inboxReadAt, findings = [] }: {
  now: Date; settings: OutreachSettings; heartbeat: Date | null; stats: { touches: number; negatives: number }; inboxReadAt: Date | null; findings?: Finding[];
}): { alerts: string[]; pause: boolean } {
  const alerts: string[] = [];
  if (!settings.enabled) return { alerts, pause: false };

  // The worker also reads the email inbox, so a stale heartbeat matters for every channel.
  const anyChannelOn = settings.channels.LINKEDIN || settings.channels.X || settings.channels.EMAIL;
  const staleMs = OUTREACH.heartbeatStaleHours * 3_600_000;
  // Both today and yesterday must be active days, else the first run after a rest day always looks stale.
  const tz = OUTREACH.operatorTimezone;
  if (anyChannelOn && isActiveDay(now, tz) && isActiveDay(addCalendarDays(now, -1), tz) && (!heartbeat || now.getTime() - heartbeat.getTime() > staleMs)) {
    alerts.push(`Worker heartbeat is stale (last: ${heartbeat?.toISOString() ?? "never"}). Check the Mac worker.`);
  }
  if (settings.channels.EMAIL && isInboxReadStale(inboxReadAt, now)) alerts.push(heldFollowUpsLine(inboxReadAt));

  const { minTouches, maxNegativeRate } = OUTREACH.autoPause;
  const negativePause = stats.touches >= minTouches && stats.negatives / stats.touches > maxNegativeRate;
  if (negativePause) alerts.push(`Auto-paused: ${stats.negatives}/${stats.touches} negative replies or opt-outs in the last 7 days.`);

  // The inbox rule above already reports held follow-ups; skip the duplicate finding.
  const shown = findings.filter((f) => f.severity !== "info" && f.id !== "followups_held");
  const pausing = shown.filter((f) => f.pause);
  for (const f of shown) alerts.push(findingLine(f));
  if (pausing.length) alerts.push(`Auto-paused by: ${pausing.map((f) => f.title).join("; ")}. Turn outreach back on in /dashboard/admin/outreach once fixed.`);
  return { alerts, pause: negativePause || pausing.length > 0 };
}
