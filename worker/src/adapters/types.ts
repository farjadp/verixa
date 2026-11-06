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
  /** True when the thread with `handle` already contains exactly `body` (crash-resend guard). */
  hasSentText(handle: string, body: string): Promise<AdapterResult<boolean>>;
  readInbox(invitedHandles: string[]): Promise<AdapterResult<InboxEvents>>;
  /** True when the browser is on a checkpoint, captcha, auth wall or login page. */
  detectCheckpoint(): Promise<boolean>;
}
