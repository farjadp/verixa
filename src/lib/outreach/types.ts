export const CHANNELS = ["LINKEDIN", "X", "EMAIL"] as const;
export type Channel = (typeof CHANNELS)[number];

export type LeadState =
  | "BACKLOG" | "INVITED" | "TOUCH_1" | "TOUCH_2" | "TOUCH_3"
  | "CONVERSATION" | "OPTED_OUT" | "CLAIMED" | "CLOSED_NO_REPLY" | "ARCHIVED";

/** States that automation never acts on again. */
export const TERMINAL_STATES: readonly LeadState[] = ["CONVERSATION", "OPTED_OUT", "CLAIMED", "ARCHIVED"];

export type ReplyLabel = "negative" | "positive" | "question" | "auto_reply";
export type Step = 1 | 2 | 3;

export interface LeadSnapshot {
  state: LeadState;
  channel: Channel;
  touchCount: number;
  nextActionAt: Date | null;
  backlogSince: Date | null;
  recontactUsed: boolean;
  timezone: string;
}

export type LeadEvent =
  | { type: "INVITE_SENT" }
  | { type: "INVITE_ACCEPTED" }
  | { type: "INVITE_EXPIRED" }
  | { type: "TOUCH_SENT"; step: Step }
  | { type: "TOUCH_CANCELLED"; step: Step }
  | { type: "NO_REPLY_TIMEOUT" }
  | { type: "COOLDOWN_ENDED" }
  | { type: "BACKLOG_EXPIRED" }
  | { type: "REPLY"; label: ReplyLabel }
  | { type: "CLAIMED" }
  | { type: "SUPPRESSED" }
  | { type: "REASSIGN"; channel: Channel };
