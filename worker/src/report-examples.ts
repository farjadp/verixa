import type { WorkerReport } from "./types";

/** One example of every report variant. The root project parses these against the real zod schema. */
export const REPORT_EXAMPLES: readonly WorkerReport[] = [
  { type: "TOUCH_RESULT", touchId: "t1", status: "SENT", externalMessageId: "ext-1" },
  { type: "TOUCH_RESULT", touchId: "t2", status: "FAILED", error: "boom" },
  { type: "INVITE_ACCEPTED", leadId: "l1" },
  { type: "REPLY", channel: "LINKEDIN", handle: "jane-doe", body: "Thanks, tell me more" },
  { type: "REPLY", channel: "EMAIL", email: "jane@example.com", body: "Not interested" },
  {
    type: "LEAD_MATCHED", consultantProfileId: "c1", channel: "X", handle: "janedoe", matchConfidence: 0.91, timezone: "America/Toronto",
    signals: { postedAboutMarketing: false, soloOrSmallFirm: true, activeLast21Days: true, socialProfileComplete: true, hadProfileViews30d: false },
  },
  { type: "DMS_CLOSED", leadId: "l2" },
  { type: "CHANNEL_HALT", channel: "LINKEDIN", reason: "CHECKPOINT", detail: "authwall" },
  { type: "CHANNEL_HALT", channel: "X", reason: "ADAPTER_BROKEN", detail: "send button missing; shot at .state/shots/a.png" },
];
