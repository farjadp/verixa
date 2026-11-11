import type { SocialProfile } from "../match";
import type { Candidate, SocialChannel } from "../types";

/**
 * Every adapter call resolves to one of these. Adapters never retry and never guess:
 * a wall is `checkpoint`, a missing element is `broken`, closed DMs are `dmsClosed`.
 */
export type AdapterResult<T> =
  | { status: "ok"; value: T }
  | { status: "dmsClosed" }
  | { status: "checkpoint"; detail: string; partial?: T }
  | { status: "broken"; detail: string; screenshot?: string; partial?: T };

export interface SentInfo {
  externalMessageId?: string;
}

/** What the live thread with one lead shows right before a send. */
export interface ThreadCheck {
  /** The thread already contains exactly the text we are about to send (crash-resend guard). */
  sent: boolean;
  /** What the lead wrote after our last message (anything they wrote if we never wrote); null when nothing. */
  inbound: string | null;
}

export interface InboxEvents {
  /** Handles (from the invitedHandles input) whose connection request was accepted. */
  acceptedHandles: string[];
  replies: { handle: string; body: string }[];
}

export interface ChannelAdapter {
  readonly channel: SocialChannel;
  findProfile(candidate: Candidate): Promise<AdapterResult<SocialProfile[]>>;
  /** Connection invite with a note. Unsupported channels throw. */
  invite(handle: string, note: string): Promise<AdapterResult<SentInfo>>;
  sendMessage(handle: string, body: string): Promise<AdapterResult<SentInfo>>;
  /** Opens the thread with `handle`: has `body` already gone out, and has the lead written since our last message? */
  checkThread(handle: string, body: string): Promise<AdapterResult<ThreadCheck>>;
  readInbox(invitedHandles: string[]): Promise<AdapterResult<InboxEvents>>;
  /** True when the browser is on a checkpoint, captcha, auth wall or login page. */
  detectCheckpoint(): Promise<boolean>;
}
