// src/lib/outreach/__tests__/engine-social.test.ts
import { describe, expect, it, vi } from "vitest";
import type { Llm } from "@/lib/content-pipeline/types";
import { applyReport, buildSocialTasks, type EngineDeps } from "../engine";
import type { LeadRow, OutreachRepo } from "../repo";

const TOR = "America/Toronto";
const NOW = new Date("2026-11-05T15:00:00Z"); // Thu 10:00

function setup(leads: LeadRow[], llmOut: unknown) {
  const touches = new Map<string, { id: string; leadId: string; step: number; status: string; body: string }>();
  const replies: unknown[] = [];
  const created: unknown[] = [];
  const repo = {
    listLeads: async (c?: string) => leads.filter((l) => !c || l.channel === c),
    getLead: async (id: string) => leads.find((l) => l.id === id) ?? null,
    findLeadByContact: async ({ handle }: { handle?: string }) => leads.find((l) => l.externalHandle === handle) ?? null,
    saveLead: async (id: string, s: object) => { Object.assign(leads.find((l) => l.id === id)!, s); },
    createLead: async (i: unknown) => { created.push(i); return true; },
    countLeadsCreatedToday: async () => 0,
    countTouchesToday: async () => 0,
    getComposeContext: async (id: string) => ({ consultantProfileId: id, email: null, firstName: "Ana", city: null, licenseNumber: "R1", profileViews30d: 0, externalHandle: "ana_rcic" }),
    createTouch: async (t: { leadId: string; step: number; status: string; body: string }) => {
      const key = `${t.leadId}:${t.step}`;
      const ex = touches.get(key);
      if (ex) return { id: ex.id, created: false, status: ex.status, body: ex.body };
      const row = { id: `t-${key}`, leadId: t.leadId, step: t.step, status: t.status, body: t.body };
      touches.set(key, row);
      return { id: row.id, created: true, status: row.status, body: row.body };
    },
    updateTouch: async (id: string, p: object) => { for (const t of touches.values()) if (t.id === id) Object.assign(t, p); },
    getTouch: async (id: string) => { for (const t of touches.values()) if (t.id === id) return { id: t.id, leadId: t.leadId, step: t.step as 1, status: t.status }; return null; },
    recordReply: async (r: unknown) => { replies.push(r); },
  } as unknown as OutreachRepo;
  const llm: Llm = { json: (async (...args: unknown[]) => {
    const m = String(args[3]).match(/FACTS: (\{[\s\S]*\})/);
    if (m) {
      const facts = JSON.parse(m[1]) as { profileUrl: string };
      return { subject: null, body: `Hi Ana, your listing is live: ${facts.profileUrl}` };
    }
    return llmOut;
  }) as never };
  const deps: EngineDeps = {
    now: () => NOW, random: () => 0.5, llm, repo, appUrl: "https://getverixa.com",
    settings: async () => ({ enabled: true, dryRun: false, channels: { LINKEDIN: true, X: true, EMAIL: false } }),
    getOffer: async () => null,
    email: { build: vi.fn(), send: vi.fn(), cancel: vi.fn() },
    suppress: vi.fn(async () => {}),
  };
  return { deps, touches, replies, created };
}

const xLead = (): LeadRow => ({
  id: "X1", consultantProfileId: "P1", externalHandle: "ana_rcic", profileClaimed: false, suppressed: false, score: 21,
  state: "BACKLOG", channel: "X", touchCount: 0, nextActionAt: null, backlogSince: NOW, recontactUsed: false, timezone: TOR,
});

describe("buildSocialTasks + applyReport", () => {
  it("hands out a queued touch once, and SENT advances the lead", async () => {
    const lead = xLead();
    const { deps } = setup([lead], { subject: null, body: "Hi Ana, your listing is live." });
    const [task] = await buildSocialTasks(deps, "X");
    expect(task).toMatchObject({ leadId: "X1", kind: "TOUCH", step: 1, handle: "ana_rcic", dryRun: false });
    expect(task.body).toContain("Not relevant?");
    expect(await buildSocialTasks(deps, "X")).toEqual([task]); // same queued touch, not a new one
    await applyReport(deps, { type: "TOUCH_RESULT", touchId: task.touchId, status: "SENT", externalMessageId: "dm1" }, { haltChannel: vi.fn() });
    expect(lead.state).toBe("TOUCH_1");
  });

  it("negative reply suppresses everywhere", async () => {
    const lead = { ...xLead(), state: "TOUCH_1" as const, touchCount: 1 };
    const { deps, replies } = setup([lead], { label: "negative", confidence: 0.95 });
    await applyReport(deps, { type: "REPLY", channel: "X", handle: "ana_rcic", body: "not for me, thanks" }, { haltChannel: vi.fn() });
    expect(lead.state).toBe("OPTED_OUT");
    expect(deps.suppress).toHaveBeenCalledWith("P1", "negative_reply", { xHandle: "ana_rcic" });
    expect(replies).toHaveLength(1);
  });

  it("drops matches below 0.8 confidence and scores the rest", async () => {
    const { deps, created } = setup([], {});
    const signals = { postedAboutMarketing: true, soloOrSmallFirm: true, activeLast21Days: true, socialProfileComplete: true, hadProfileViews30d: false };
    await applyReport(deps, { type: "LEAD_MATCHED", consultantProfileId: "P9", channel: "LINKEDIN", handle: "in/x", matchConfidence: 0.6, timezone: TOR, signals }, { haltChannel: vi.fn() });
    expect(created).toHaveLength(0);
    await applyReport(deps, { type: "LEAD_MATCHED", consultantProfileId: "P9", channel: "LINKEDIN", handle: "in/x", matchConfidence: 0.9, timezone: TOR, signals }, { haltChannel: vi.fn() });
    expect(created[0]).toMatchObject({ consultantProfileId: "P9", score: 30, externalHandle: "in/x" });
  });

  it("halts a channel on checkpoint", async () => {
    const { deps } = setup([], {});
    const haltChannel = vi.fn(async () => {});
    await applyReport(deps, { type: "CHANNEL_HALT", channel: "LINKEDIN", reason: "CHECKPOINT", detail: "verify page" }, { haltChannel });
    expect(haltChannel).toHaveBeenCalledWith("LINKEDIN", "CHECKPOINT", "verify page");
  });

  it("returns no tasks when the channel is disabled", async () => {
    const { deps } = setup([xLead()], {});
    deps.settings = async () => ({ enabled: true, dryRun: false, channels: { LINKEDIN: true, X: false, EMAIL: false } });
    expect(await buildSocialTasks(deps, "X")).toEqual([]);
  });
});
