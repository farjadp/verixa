import { addCalendarDays, startOfActiveDayAfter } from "./calendar";
import { OUTREACH } from "./config";
import type { Channel, LeadEvent, LeadSnapshot, LeadState, Step } from "./types";

export class InvalidTransitionError extends Error {
  constructor(state: LeadState, event: LeadEvent["type"]) {
    super(`Invalid outreach transition: ${event} from ${state}`);
    this.name = "InvalidTransitionError";
  }
}

const TOUCH_STATE: Record<Step, LeadState> = { 1: "TOUCH_1", 2: "TOUCH_2", 3: "TOUCH_3" };
const LIVE_REPLY_STATES: readonly LeadState[] = ["INVITED", "TOUCH_1", "TOUCH_2", "TOUCH_3", "CLOSED_NO_REPLY", "CONVERSATION"];

const isStep = (n: unknown): n is Step => n === 1 || n === 2 || n === 3;

export function newBacklogLead(channel: Channel, timezone: string, now: Date): LeadSnapshot {
  return { state: "BACKLOG", channel, touchCount: 0, nextActionAt: null, backlogSince: now, recontactUsed: false, timezone };
}

export function transition(lead: LeadSnapshot, event: LeadEvent, now: Date): LeadSnapshot {
  const fail = (): never => { throw new InvalidTransitionError(lead.state, event.type); };
  const s = lead.state;

  switch (event.type) {
    case "CLAIMED":
      return s === "CLAIMED" ? lead : { ...lead, state: "CLAIMED", nextActionAt: null };

    case "SUPPRESSED":
      return s === "CLAIMED" || s === "OPTED_OUT" ? lead : { ...lead, state: "OPTED_OUT", nextActionAt: null };

    case "REPLY": {
      if (!LIVE_REPLY_STATES.includes(s)) return fail();
      if (event.label === "negative") return { ...lead, state: "OPTED_OUT", nextActionAt: null };
      if (event.label === "auto_reply") {
        if (s !== "TOUCH_1" && s !== "TOUCH_2" && s !== "TOUCH_3") return lead;
        const base = lead.nextActionAt && lead.nextActionAt > now ? lead.nextActionAt : now;
        return { ...lead, nextActionAt: startOfActiveDayAfter(base, OUTREACH.autoReplyDelayActiveDays, lead.timezone) };
      }
      return { ...lead, state: "CONVERSATION", nextActionAt: null };
    }

    case "INVITE_SENT":
      if (s !== "BACKLOG" || lead.channel !== "LINKEDIN" || lead.touchCount !== 0) return fail();
      return { ...lead, state: "INVITED", touchCount: 1, backlogSince: null, nextActionAt: addCalendarDays(now, OUTREACH.inviteExpiryDays) };

    case "INVITE_ACCEPTED":
      if (s !== "INVITED") return fail();
      return { ...lead, state: "TOUCH_1", nextActionAt: startOfActiveDayAfter(now, OUTREACH.inviteAcceptedNextTouchActiveDays, lead.timezone) };

    case "INVITE_EXPIRED":
      if (s !== "INVITED") return fail();
      return { ...lead, state: "TOUCH_1", channel: "EMAIL", nextActionAt: now };

    case "TOUCH_SENT": {
      if (!isStep(event.step)) return fail();
      if (lead.touchCount >= OUTREACH.maxTouchesPerPerson) return fail();
      if (event.step === 1 && lead.channel === "LINKEDIN") return fail();
      const expectedFrom: LeadState = event.step === 1 ? "BACKLOG" : TOUCH_STATE[(event.step - 1) as Step];
      if (s !== expectedFrom || lead.touchCount !== event.step - 1) return fail();
      return {
        ...lead,
        state: TOUCH_STATE[event.step],
        touchCount: event.step,
        backlogSince: null,
        nextActionAt: startOfActiveDayAfter(now, OUTREACH.waitActiveDaysAfterTouch[event.step], lead.timezone),
      };
    }

    case "TOUCH_CANCELLED": {
      if (!isStep(event.step)) return fail();
      if (s !== TOUCH_STATE[event.step] || lead.touchCount !== event.step) return fail();
      if (event.step === 1) return { ...lead, state: "BACKLOG", touchCount: 0, backlogSince: now, nextActionAt: now };
      return { ...lead, state: TOUCH_STATE[(event.step - 1) as Step], touchCount: event.step - 1, nextActionAt: now };
    }

    case "NO_REPLY_TIMEOUT":
      if (s !== "TOUCH_3" && s !== "TOUCH_2") return fail();
      return { ...lead, state: "CLOSED_NO_REPLY", nextActionAt: addCalendarDays(now, OUTREACH.cooldownDays) };

    case "COOLDOWN_ENDED":
      if (s !== "CLOSED_NO_REPLY") return fail();
      if (lead.recontactUsed) return { ...lead, state: "ARCHIVED", nextActionAt: null };
      return { ...lead, state: "BACKLOG", touchCount: 0, recontactUsed: true, backlogSince: now, nextActionAt: null };

    case "BACKLOG_EXPIRED":
      if (s !== "BACKLOG") return fail();
      return { ...lead, state: "ARCHIVED", nextActionAt: null };

    case "REASSIGN":
      if (s !== "BACKLOG") return fail();
      return { ...lead, channel: event.channel };
  }
}
