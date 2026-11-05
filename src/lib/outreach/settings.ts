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
const flagKey = (f: OutreachFlag) => (f === "enabled" || f === "dryRun" ? `${PREFIX}${f}` : `${PREFIX}${f.toLowerCase()}.enabled`);

export async function getOutreachSettings(): Promise<OutreachSettings> {
  const rows = await prisma.platformSetting.findMany({ where: { key: { startsWith: PREFIX } } });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const flag = (f: OutreachFlag, fallback: boolean) => (map.has(flagKey(f)) ? map.get(flagKey(f)) === "true" : fallback);
  return {
    enabled: flag("enabled", false),
    dryRun: flag("dryRun", true),
    channels: Object.fromEntries(CHANNELS.map((c) => [c, flag(c, false)])) as Record<Channel, boolean>,
  };
}

export async function setOutreachFlag(f: OutreachFlag, value: boolean): Promise<void> {
  const key = flagKey(f);
  await prisma.platformSetting.upsert({ where: { key }, create: { key, value: String(value) }, update: { value: String(value) } });
}

export async function recordHeartbeat(now: Date): Promise<void> {
  const value = now.toISOString();
  await prisma.platformSetting.upsert({ where: { key: HEARTBEAT }, create: { key: HEARTBEAT, value }, update: { value } });
}

export async function getHeartbeat(): Promise<Date | null> {
  const row = await prisma.platformSetting.findUnique({ where: { key: HEARTBEAT } });
  return row ? new Date(row.value) : null;
}
