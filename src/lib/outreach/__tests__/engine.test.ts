// src/lib/outreach/__tests__/engine.test.ts
import { describe, expect, it, vi } from "vitest";
import type { Llm } from "@/lib/content-pipeline/types";
import { cancelScheduledEmails, planEmailDay, type EngineDeps } from "../engine";
import type { LeadRow, OutreachRepo } from "../repo";
import type { LeadSnapshot } from "../types";

const TOR = "America/Toronto";
const NOW = new Date("2026-11-05T11:00:00Z"); // Thu 06:00 Toronto — daily cron time

function memoryRepo(leads: LeadRow[]) {
  const touches: { id: string; leadId: string; step: number; status: string; externalMessageId?: string; scheduledFor?: Date; key: string; body: string }[] = [];
  const repo: OutreachRepo = {
    listLeads: async (c) => leads.filter((l) => !c || l.channel === c),
    getLead: async (id) => leads.find((l) => l.id === id) ?? null,
    findLeadByContact: async () => null,
    saveLead: async (id, s: LeadSnapshot) => { Object.assign(leads.find((l) => l.id === id)!, s); },
    createLead: async () => false,
    countLeadsCreatedToday: async () => 8,
    countTouchesToday: async () => 0,
    findDiscoveryCandidates: async () => [],
    getComposeContext: async (leadId) => ({ consultantProfileId: leadId, email: `${leadId}@firm.ca`, firstName: "Sam", city: null, licenseNumber: `R${leadId}`, profileViews30d: 0, externalHandle: null }),
    createTouch: async (t) => {
      const key = `${t.leadId}:${t.step}:${t.cycle}:${t.status}`;
      const ex = touches.find((x) => x.key === key);
      if (ex) return { id: ex.id, created: false, status: ex.status, body: ex.body };
      const row = { id: `t${touches.length}`, leadId: t.leadId, step: t.step, status: t.status, key, body: t.body };
      touches.push(row);
      return { id: row.id, created: true, status: row.status, body: row.body };
    },
    updateTouch: async (id, p) => { Object.assign(touches.find((t) => t.id === id)!, p); },
    getTouch: async () => null,
    findTouchByExternalId: async () => null,
    listFutureScheduledEmailTouches: async (now) => touches.filter((t) => t.status === "SCHEDULED" && t.scheduledFor! > now).map((t) => ({ id: t.id, leadId: t.leadId, step: t.step as 1, externalMessageId: t.externalMessageId! })),
    recordReply: async () => {},
    negativeStats: async () => ({ touches: 0, negatives: 0 }),
  };
  return { repo, touches };
}

const backlog = (id: string, score: number): LeadRow => ({
  id, consultantProfileId: id, externalHandle: null, profileClaimed: false, suppressed: false, score,
  state: "BACKLOG", channel: "EMAIL", touchCount: 0, nextActionAt: null, backlogSince: new Date("2026-11-04T12:00:00Z"), recontactUsed: false, timezone: TOR,
});

function deps(repo: OutreachRepo, over: Partial<EngineDeps> = {}): EngineDeps {
  const llm: Llm = { json: (async (...args: unknown[]) => {
    const facts = JSON.parse(String(args[3]).match(/FACTS: (\{[\s\S]*\})/)![1]) as { profileUrl: string };
    return { subject: "Your Verixa listing", body: `Hi Sam, your listing is live: ${facts.profileUrl}` };
  }) as never };
  let n = 0;
  return {
    now: () => NOW, random: () => 0.5, llm, repo, appUrl: "https://getverixa.com",
    settings: async () => ({ enabled: true, dryRun: false, channels: { EMAIL: true, LINKEDIN: false, X: false } }),
    getOffer: async () => null,
    email: { build: (i) => ({ from: "f", to: i.to, replyTo: "r", subject: i.subject, text: i.body, html: i.body, headers: {} }), send: vi.fn(async () => ({ id: `re_${n++}` })), cancel: vi.fn(async () => {}) },
    suppress: vi.fn(async () => {}),
    ...over,
  };
}

describe("planEmailDay", () => {
  it("schedules the top 5 inside 08:00–13:00 local with 5–13 minute gaps and advances state", async () => {
    const leads = Array.from({ length: 7 }, (_, i) => backlog(`L${i}`, 13 + i));
    const { repo, touches } = memoryRepo(leads);
    const d = deps(repo);
    const res = await planEmailDay(d);
    expect(res).toEqual({ status: "ok", scheduled: 5, dryRun: 0, failed: 0 });
    const times = (d.email.send as ReturnType<typeof vi.fn>).mock.calls.map((c) => (c[1] as Date).getTime());
    expect(new Date(times[0]).toISOString()).toBe("2026-11-05T13:07:00.000Z"); // 08:00 + round(0.5*13) min
    for (let i = 1; i < times.length; i++) expect((times[i] - times[i - 1]) / 60000).toBe(9); // 5 + 0.5*8
    expect(leads.filter((l) => l.state === "TOUCH_1").map((l) => l.id).sort()).toEqual(["L2", "L3", "L4", "L5", "L6"]);
    expect(touches.every((t) => t.status === "SCHEDULED")).toBe(true);
  });

  it("dry-run records touches but sends nothing and keeps state", async () => {
    const leads = [backlog("A", 20)];
    const { repo, touches } = memoryRepo(leads);
    const d = deps(repo, { settings: async () => ({ enabled: true, dryRun: true, channels: { EMAIL: true, LINKEDIN: false, X: false } }) });
    expect(await planEmailDay(d)).toEqual({ status: "ok", scheduled: 0, dryRun: 1, failed: 0 });
    expect(d.email.send).not.toHaveBeenCalled();
    expect(leads[0].state).toBe("BACKLOG");
    expect(touches[0].status).toBe("DRY_RUN");
  });

  it("does nothing when disabled or on a rest day", async () => {
    const { repo } = memoryRepo([backlog("A", 20)]);
    expect((await planEmailDay(deps(repo, { settings: async () => ({ enabled: false, dryRun: false, channels: { EMAIL: true, LINKEDIN: false, X: false } }) }))).status).toBe("disabled");
    expect((await planEmailDay(deps(repo, { now: () => new Date("2026-11-06T11:00:00Z") }))).status).toBe("rest_day");
  });

  it("moves claimed leads to CLAIMED instead of emailing them", async () => {
    const lead = { ...backlog("A", 20), profileClaimed: true };
    const { repo } = memoryRepo([lead]);
    const d = deps(repo);
    await planEmailDay(d);
    expect(lead.state).toBe("CLAIMED");
    expect(d.email.send).not.toHaveBeenCalled();
  });
});

describe("cancelScheduledEmails", () => {
  it("cancels future sends and reverts the lead", async () => {
    const leads = [backlog("A", 20)];
    const { repo } = memoryRepo(leads);
    const d = deps(repo);
    await planEmailDay(d);
    expect(leads[0].state).toBe("TOUCH_1");
    expect(await cancelScheduledEmails(d)).toBe(1);
    expect(d.email.cancel).toHaveBeenCalledWith("re_0");
    expect(leads[0].state).toBe("BACKLOG");
  });
});
