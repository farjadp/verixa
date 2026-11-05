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

  it("treats malformed dryRun as dry-run and malformed enabled as off", async () => {
    for (const bad of ["TRUE", "1", "", " true"]) {
      store.set("outreach.dryRun", bad);
      store.set("outreach.enabled", bad);
      const s = await getOutreachSettings();
      expect(s.dryRun).toBe(true);
      expect(s.enabled).toBe(false);
    }
    store.set("outreach.dryRun", "false");
    expect((await getOutreachSettings()).dryRun).toBe(false);
  });

  it("returns null for an unparseable heartbeat", async () => {
    store.set("outreach.worker.lastHeartbeat", "garbage");
    expect(await getHeartbeat()).toBeNull();
  });

  it("stores the heartbeat", async () => {
    const t = new Date("2026-11-05T15:00:00Z");
    await recordHeartbeat(t);
    expect(await getHeartbeat()).toEqual(t);
  });
});
