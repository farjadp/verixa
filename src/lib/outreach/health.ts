import { isActiveDay } from "./calendar";
import { OUTREACH } from "./config";
import type { OutreachSettings } from "./settings";

export function checkHealth({ now, settings, heartbeat, stats }: {
  now: Date; settings: OutreachSettings; heartbeat: Date | null; stats: { touches: number; negatives: number };
}): { alerts: string[]; pause: boolean } {
  const alerts: string[] = [];
  if (!settings.enabled) return { alerts, pause: false };

  const socialOn = settings.channels.LINKEDIN || settings.channels.X;
  const staleMs = OUTREACH.heartbeatStaleHours * 3_600_000;
  if (socialOn && isActiveDay(now, OUTREACH.operatorTimezone) && (!heartbeat || now.getTime() - heartbeat.getTime() > staleMs)) {
    alerts.push(`Worker heartbeat is stale (last: ${heartbeat?.toISOString() ?? "never"}). Check the Mac worker.`);
  }

  const { minTouches, maxNegativeRate } = OUTREACH.autoPause;
  const pause = stats.touches >= minTouches && stats.negatives / stats.touches > maxNegativeRate;
  if (pause) alerts.push(`Auto-paused: ${stats.negatives}/${stats.touches} negative replies or opt-outs in the last 7 days.`);
  return { alerts, pause };
}
