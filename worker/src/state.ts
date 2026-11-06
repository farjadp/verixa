import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export interface ActionEntry {
  channel: "LINKEDIN" | "X";
  touchId: string;
  handle: string;
  kind: "INVITE" | "TOUCH";
}

interface StateFile {
  imapLastUid: number | null;
  actions: Record<string, ActionEntry[]>;
}

const KEEP_DAYS = 14;

/** Small JSON store: IMAP last-seen UID and a per-day log of actions taken (bookkeeping for the crash-resend guard). */
export class FileState {
  private data: StateFile = { imapLastUid: null, actions: {} };

  constructor(private readonly path: string) {
    if (!existsSync(path)) return;
    try {
      const parsed = JSON.parse(readFileSync(path, "utf8")) as Partial<StateFile>;
      this.data = { imapLastUid: parsed.imapLastUid ?? null, actions: parsed.actions ?? {} };
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
