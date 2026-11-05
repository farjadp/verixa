import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    platformSetting: {
      findMany: vi.fn(async ({ where }: { where: { key: { startsWith: string } } }) =>
        [...store].filter(([k]) => k.startsWith(where.key.startsWith)).map(([key, value]) => ({ key, value }))),
      upsert: vi.fn(async ({ where, create }: { where: { key: string }; create: { value: string } }) => { store.set(where.key, create.value); }),
      findUnique: vi.fn(async ({ where }: { where: { key: string } }) => (store.has(where.key) ? { value: store.get(where.key) } : null)),
    },
  },
}));

import { getHeartbeat, getOutreachSettings, recordHeartbeat, setOutreachFlag } from "../settings";

describe("outreach settings", () => {
  beforeEach(() => store.clear());

  it("defaults to off, dry-run, all channels disabled", async () => {
    expect(await getOutreachSettings()).toEqual({ enabled: false, dryRun: true, channels: { LINKEDIN: false, X: false, EMAIL: false } });
  });

  it("persists flags", async () => {
    await setOutreachFlag("enabled", true);
    await setOutreachFlag("EMAIL", true);
    await setOutreachFlag("dryRun", false);
    expect(await getOutreachSettings()).toEqual({ enabled: true, dryRun: false, channels: { LINKEDIN: false, X: false, EMAIL: true } });
  });

  it("stores the heartbeat", async () => {
    const t = new Date("2026-11-05T15:00:00Z");
    await recordHeartbeat(t);
    expect(await getHeartbeat()).toEqual(t);
  });
});
