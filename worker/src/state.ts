import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { SocialChannel } from "./types";

/** A reply read from a social inbox (conversation already marked read) that the server has not yet taken. */
export interface PendingReply {
  channel: SocialChannel;
  handle: string;
  body: string;
}

export interface PendingReplyStore {
  addPendingReply(r: PendingReply): void;
  pendingReplies(channel: SocialChannel): PendingReply[];
  removePendingReply(r: PendingReply): void;
}

/** Mirrors the REPLY body limit in workerReportSchema. */
export const REPLY_BODY_MAX = 8000;

/** Dedup key: channel + handle (case-insensitive) + body hash. */
export function pendingReplyKey(r: PendingReply): string {
  const body = r.body.slice(0, REPLY_BODY_MAX);
  return `${r.channel}:${r.handle.toLowerCase()}:${createHash("sha256").update(body).digest("hex")}`;
}

export interface ActionEntry {
  channel: "LINKEDIN" | "X";
  touchId: string;
  handle: string;
  kind: "INVITE" | "TOUCH";
}

interface StateFile {
  imapLastUid: number | null;
  actions: Record<string, ActionEntry[]>;
  /** Added later; a file without it reads as an empty queue. */
  pendingReplies: (PendingReply & { key: string })[];
}

const KEEP_DAYS = 14;

/** Small JSON store: IMAP last-seen UID, a per-day log of actions taken (crash-resend guard) and replies not yet reported. */
export class FileState implements PendingReplyStore {
  private data: StateFile = { imapLastUid: null, actions: {}, pendingReplies: [] };

  constructor(private readonly path: string) {
    if (!existsSync(path)) return;
    try {
      const parsed = JSON.parse(readFileSync(path, "utf8")) as Partial<StateFile>;
      this.data = { imapLastUid: parsed.imapLastUid ?? null, actions: parsed.actions ?? {}, pendingReplies: parsed.pendingReplies ?? [] };
    } catch {
      throw new Error(`Worker state file is corrupt: ${path}. Inspect or delete it, then retry.`);
    }
  }

  getImapLastUid(): number | null {
    return this.data.imapLastUid;
  }

  setImapLastUid(uid: number): void {
    this.data.imapLastUid = uid;
    this.save();
  }

  recordAction(day: string, entry: ActionEntry): void {
    (this.data.actions[day] ??= []).push(entry);
    this.prune(day);
    this.save();
  }

  countActions(day: string, channel: ActionEntry["channel"]): number {
    return (this.data.actions[day] ?? []).filter((a) => a.channel === channel).length;
  }

  hasAction(touchId: string): boolean {
    return Object.values(this.data.actions).some((list) => list.some((a) => a.touchId === touchId));
  }

  addPendingReply(r: PendingReply): void {
    const key = pendingReplyKey(r);
    if (this.data.pendingReplies.some((p) => p.key === key)) return;
    this.data.pendingReplies.push({ channel: r.channel, handle: r.handle, body: r.body.slice(0, REPLY_BODY_MAX), key });
    this.save();
  }

  pendingReplies(channel: SocialChannel): PendingReply[] {
    return this.data.pendingReplies.filter((p) => p.channel === channel).map(({ channel: c, handle, body }) => ({ channel: c, handle, body }));
  }

  removePendingReply(r: PendingReply): void {
    const key = pendingReplyKey(r);
    const before = this.data.pendingReplies.length;
    this.data.pendingReplies = this.data.pendingReplies.filter((p) => p.key !== key);
    if (this.data.pendingReplies.length !== before) this.save();
  }

  private prune(today: string): void {
    const cutoff = new Date(`${today}T00:00:00Z`).getTime() - KEEP_DAYS * 86_400_000;
    for (const day of Object.keys(this.data.actions)) {
      if (new Date(`${day}T00:00:00Z`).getTime() < cutoff) delete this.data.actions[day];
    }
  }

  private save(): void {
    mkdirSync(dirname(this.path), { recursive: true });
    const tmp = `${this.path}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    renameSync(tmp, this.path);
  }
}
