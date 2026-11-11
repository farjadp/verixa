import { prisma } from "@/lib/prisma";
import { CHANNELS, type Channel } from "./types";

export type OutreachFlag = "enabled" | "dryRun" | Channel;
export interface OutreachSettings {
  enabled: boolean;
  dryRun: boolean;
  channels: Record<Channel, boolean>;
}

const PREFIX = "outreach.";
const HEARTBEAT = "outreach.worker.lastHeartbeat";
/** Set only by a heartbeat whose run read the IMAP inbox successfully. The plain heartbeat is no proof of that. */
const INBOX_READ = "outreach.worker.lastInboxReadAt";
const flagKey = (f: OutreachFlag) => (f === "enabled" || f === "dryRun" ? `${PREFIX}${f}` : `${PREFIX}${f.toLowerCase()}.enabled`);

export async function getOutreachSettings(): Promise<OutreachSettings> {
  const rows = await prisma.platformSetting.findMany({ where: { key: { startsWith: PREFIX } } });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const flag = (f: OutreachFlag, fallback: boolean) => (map.has(flagKey(f)) ? map.get(flagKey(f)) === "true" : fallback);
  return {
    enabled: flag("enabled", false),
    // Fail safe: live sending only when the stored value is exactly "false".
    dryRun: !map.has(flagKey("dryRun")) || map.get(flagKey("dryRun")) !== "false",
    channels: Object.fromEntries(CHANNELS.map((c) => [c, flag(c, false)])) as Record<Channel, boolean>,
  };
}

export async function setOutreachFlag(f: OutreachFlag, value: boolean): Promise<void> {
  const key = flagKey(f);
  await prisma.platformSetting.upsert({ where: { key }, create: { key, value: String(value) }, update: { value: String(value) } });
}

async function writeTime(key: string, at: Date): Promise<void> {
  const value = at.toISOString();
  await prisma.platformSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

async function readTime(key: string): Promise<Date | null> {
  const row = await prisma.platformSetting.findUnique({ where: { key } });
  if (!row) return null;
  const d = new Date(row.value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function recordHeartbeat(now: Date, opts: { inboxRead?: boolean } = {}): Promise<void> {
  await writeTime(HEARTBEAT, now);
  if (opts.inboxRead) await writeTime(INBOX_READ, now);
}

export const getHeartbeat = (): Promise<Date | null> => readTime(HEARTBEAT);

/** When the worker last read the email inbox successfully; null if never (or unreadable). */
export const getInboxReadAt = (): Promise<Date | null> => readTime(INBOX_READ);
