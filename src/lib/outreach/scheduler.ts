import { addCalendarDays, inSendWindow, isActiveDay } from "./calendar";
import { OUTREACH } from "./config";
import type { Channel, LeadSnapshot, Step } from "./types";

export interface SchedulableLead extends LeadSnapshot {
  id: string;
  score: number;
}

export type Task =
  | { kind: "INVITE"; leadId: string; step: 1 }
  | { kind: "TOUCH"; leadId: string; step: Step }
  | { kind: "CLOSE" | "EXPIRE_INVITE" | "ARCHIVE" | "RECONTACT"; leadId: string };

export interface ScheduleInput {
  channel: Channel;
  leads: SchedulableLead[];
  now: Date;
  sentToday: number;
  offerAvailable: boolean;
  /** Email plans the day before the window opens: require only an active day. */
  activeDayOnly?: boolean;
}

const due = (l: SchedulableLead, now: Date) => l.nextActionAt !== null && l.nextActionAt <= now;

export function planTasks({ channel, leads, now, sentToday, offerAvailable, activeDayOnly }: ScheduleInput): Task[] {
  const mine = leads.filter((l) => l.channel === channel);
  const maintenance: Task[] = [];
  const followUps: SchedulableLead[] = [];
  const backlog: SchedulableLead[] = [];

  for (const l of mine) {
    if (l.state === "BACKLOG" && l.backlogSince && addCalendarDays(l.backlogSince, OUTREACH.backlogExpiryDays) <= now) {
      maintenance.push({ kind: "ARCHIVE", leadId: l.id });
    } else if (l.state === "CLOSED_NO_REPLY" && due(l, now)) {
      maintenance.push({ kind: "RECONTACT", leadId: l.id });
    } else if (l.state === "INVITED" && due(l, now)) {
      maintenance.push({ kind: "EXPIRE_INVITE", leadId: l.id });
    } else if (l.state === "TOUCH_3" && due(l, now)) {
      maintenance.push({ kind: "CLOSE", leadId: l.id });
    } else if (l.state === "TOUCH_2" && due(l, now) && !offerAvailable) {
      maintenance.push({ kind: "CLOSE", leadId: l.id });
    } else if ((l.state === "TOUCH_1" || l.state === "TOUCH_2") && due(l, now)) {
      followUps.push(l);
    } else if (l.state === "BACKLOG" && (l.nextActionAt === null || due(l, now))) {
      backlog.push(l);
    }
  }

  const sendable = (l: SchedulableLead) => (activeDayOnly ? isActiveDay(now, l.timezone) : inSendWindow(now, l.timezone));
  followUps.sort((a, b) => a.nextActionAt!.getTime() - b.nextActionAt!.getTime());
  backlog.sort((a, b) => b.score - a.score);

  const capacity = Math.max(0, OUTREACH.touchesPerChannelPerDay - sentToday);
  const sends: Task[] = [];
  for (const l of [...followUps, ...backlog]) {
    if (sends.length >= capacity) break;
    if (!sendable(l)) continue;
    if (l.state === "BACKLOG") {
      sends.push(channel === "LINKEDIN" ? { kind: "INVITE", leadId: l.id, step: 1 } : { kind: "TOUCH", leadId: l.id, step: 1 });
    } else {
      sends.push({ kind: "TOUCH", leadId: l.id, step: (l.touchCount + 1) as Step });
    }
  }
  return [...maintenance, ...sends];
}
