// src/lib/outreach/__tests__/engine-social.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OutreachConfigError } from "../email";
import type { Llm } from "@/lib/content-pipeline/types";
import { applyReport, buildSocialTasks, workerReportSchema, type EngineDeps } from "../engine";
import type { LeadRow, OutreachRepo } from "../repo";

const TOR = "America/Toronto";
const NOW = new Date("2026-11-05T15:00:00Z"); // Thu 10:00

interface Elig { exists: boolean; claimed: boolean; ciccActive: boolean; suppressed: boolean }
const OK_ELIG: Elig = { exists: true, claimed: false, ciccActive: true, suppressed: false };

function setup(leads: LeadRow[], llmOut: unknown, elig: Elig = OK_ELIG) {
  const touches = new Map<string, { id: string; leadId: string; step: number; status: string; body: string; channel: string }>();
  const replies: unknown[] = [];
  const created: unknown[] = [];
  const repo = {
    listLeads: async (c?: string) => leads.filter((l) => !c || l.channel === c),
    getLead: async (id: string) => leads.find((l) => l.id === id) ?? null,
    getProfileEligibility: async () => elig,
    findLeadByContact: async ({ handle }: { handle?: string; channel: string }) => leads.find((l) => l.externalHandle === handle) ?? null,
    saveLead: async (id: string, s: object) => { Object.assign(leads.find((l) => l.id === id)!, s); },
    createLead: async (i: unknown) => { created.push(i); return true; },
    countLeadsCreatedToday: async () => 0,
    countTouchesToday: async () => [...touches.values()].filter((t) => t.status === "QUEUED").length,
    getComposeContext: async (id: string) => ({ consultantProfileId: id, email: null, firstName: "Ana", city: null, licenseNumber: "R1", profileViews30d: 0, externalHandle: "ana_rcic" }),
    createTouch: async (t: { leadId: string; step: number; status: string; body: string; channel: string }) => {
      const key = `${t.leadId}:${t.step}`;
      const ex = touches.get(key);
      if (ex) return { id: ex.id, created: false, status: ex.status, body: ex.body };
      const row = { id: `t-${key}`, leadId: t.leadId, step: t.step, status: t.status, body: t.body, channel: t.channel };
      touches.set(key, row);
      return { id: row.id, created: true, status: row.status, body: row.body };
    },
    updateTouch: async (id: string, p: object) => { for (const t of touches.values()) if (t.id === id) Object.assign(t, p); },
    listQueuedTouches: async () => [...touches.values()].filter((t) => t.status === "QUEUED"),
    getTouch: async (id: string) => { for (const t of touches.values()) if (t.id === id) return { id: t.id, leadId: t.leadId, channel: t.channel, step: t.step as 1, status: t.status }; return null; },
    recordReply: async (r: { leadId: string; body: string }) => {
      if (replies.some((x) => (x as { leadId: string; body: string }).leadId === r.leadId && (x as { body: string }).body === r.body)) return false;
      replies.push(r);
      return true;
    },
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
    inboxReadAt: async () => null,
    alertConfigured: true,
  };
  return { deps, touches, replies, created };
}

const xLead = (): LeadRow => ({
  id: "X1", consultantProfileId: "P1", externalHandle: "ana_rcic", profileClaimed: false, suppressed: false, score: 21,
  state: "BACKLOG", channel: "X", touchCount: 0, nextActionAt: null, backlogSince: NOW, recontactUsed: false, timezone: TOR,
});

describe("buildSocialTasks + applyReport", () => {
  beforeEach(() => { vi.stubEnv("OUTREACH_SENDER_LEGAL_NAME", "VisaRoads Inc."); });
  afterEach(() => { vi.unstubAllEnvs(); });

  it("hands out no work when founder alerts are not configured, even with flags on", async () => {
    const { deps, touches } = setup([xLead()], { subject: null, body: "unused" });
    deps.alertConfigured = false;
    expect(await buildSocialTasks(deps, "X")).toEqual([]);
    expect(touches.size).toBe(0);
  });

  it("stops with a config error, and queues nothing, when the legal sender name is unset", async () => {
    vi.stubEnv("OUTREACH_SENDER_LEGAL_NAME", "");
    const { deps, touches } = setup([xLead()], { subject: null, body: "unused" });
    await expect(buildSocialTasks(deps, "X")).rejects.toThrow(OutreachConfigError);
    await expect(buildSocialTasks(deps, "X")).rejects.toThrow(/OUTREACH_SENDER_LEGAL_NAME/);
    expect(touches.size).toBe(0);
  });

  it("hands out a queued touch once, and SENT advances the lead", async () => {
    const lead = xLead();
    const { deps } = setup([lead], { subject: null, body: "Hi Ana, your listing is live." });
    const [task] = await buildSocialTasks(deps, "X");
    expect(task).toMatchObject({ leadId: "X1", kind: "TOUCH", step: 1, handle: "ana_rcic", dryRun: false, timezone: TOR });
    expect(task.body).toContain("Not relevant?");
    expect(task.body).toContain("Farjad, Verixa (VisaRoads Inc.)");
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

  it("an unmatched reply is skipped with ok:true so the worker's batch and UID can advance", async () => {
    const { deps, replies } = setup([xLead()], { label: "positive", confidence: 0.9 });
    const r = await applyReport(deps, { type: "REPLY", channel: "X", handle: "nobody", body: "hi" }, { haltChannel: vi.fn() });
    expect(r.ok).toBe(true);
    expect(r.detail).toMatch(/skipped/);
    expect(replies).toEqual([]);
  });

  it("a negative reply from a lead already in a terminal state still suppresses, and is ok:true", async () => {
    const lead = { ...xLead(), state: "ARCHIVED" as const, touchCount: 1 };
    const { deps, replies } = setup([lead], { label: "negative", confidence: 0.95 });
    const r = await applyReport(deps, { type: "REPLY", channel: "X", handle: "ana_rcic", body: "not for me, thanks" }, { haltChannel: vi.fn() });
    expect(r.ok).toBe(true);
    expect(deps.suppress).toHaveBeenCalledWith("P1", "negative_reply", { xHandle: "ana_rcic" });
    expect(replies).toHaveLength(1);
    expect(lead.state).toBe("ARCHIVED");
  });

  it("looks the lead up including terminal states", async () => {
    const { deps } = setup([xLead()], { label: "positive", confidence: 0.9 });
    const spy = vi.spyOn(deps.repo, "findLeadByContact");
    await applyReport(deps, { type: "REPLY", channel: "X", handle: "ana_rcic", body: "hello" }, { haltChannel: vi.fn() });
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ includeTerminal: true }));
  });

  it("UNCERTAIN holds the touch, alerts the founder, and never re-hands or revives it", async () => {
    const lead = xLead();
    const { deps, touches } = setup([lead], { subject: null, body: "Hi Ana, your listing is live." });
    deps.alert = vi.fn(async () => {});
    const [task] = await buildSocialTasks(deps, "X");
    const r = await applyReport(deps, { type: "TOUCH_RESULT", touchId: task.touchId, status: "UNCERTAIN", error: "click timed out" }, { haltChannel: vi.fn() });
    expect(r.ok).toBe(true);
    expect([...touches.values()][0].status).toBe("UNCERTAIN");
    expect(deps.alert).toHaveBeenCalledTimes(1);
    expect(lead.state).toBe("BACKLOG");
    expect(await buildSocialTasks(deps, "X")).toEqual([]);
  });

  it("DMS_CLOSED on a BACKLOG lead cancels the queued touch (freeing the idempotency key and cap) and moves it to email", async () => {
    const lead = xLead();
    const { deps, touches } = setup([lead], { subject: null, body: "Hi Ana, your listing is live." });
    await buildSocialTasks(deps, "X");
    const r = await applyReport(deps, { type: "DMS_CLOSED", leadId: "X1" }, { haltChannel: vi.fn() });
    expect(r.ok).toBe(true);
    expect(lead.channel).toBe("EMAIL");
    expect([...touches.values()][0].status).toBe("CANCELLED");
  });

  it("DMS_CLOSED on a lead past BACKLOG is ok:true skipped, and the touch is failed so it is not re-handed", async () => {
    const lead = { ...xLead(), state: "TOUCH_1" as const, touchCount: 1, nextActionAt: NOW };
    const { deps, touches } = setup([lead], { subject: null, body: "Hi Ana, follow up." });
    const [task] = await buildSocialTasks(deps, "X");
    expect(task).toBeDefined();
    const r = await applyReport(deps, { type: "DMS_CLOSED", leadId: "X1" }, { haltChannel: vi.fn() });
    expect(r.ok).toBe(true);
    expect(r.detail).toMatch(/skipped/);
    expect(lead.channel).toBe("X");
    expect([...touches.values()][0].status).toBe("FAILED");
  });

  it("DMS_CLOSED for an unknown lead is ok:true skipped", async () => {
    const { deps } = setup([xLead()], {});
    expect((await applyReport(deps, { type: "DMS_CLOSED", leadId: "nope" }, { haltChannel: vi.fn() })).ok).toBe(true);
  });

  it("a replayed reply is recorded once, does not touch the lead again, but a replayed opt-out still suppresses", async () => {
    const lead = { ...xLead(), state: "TOUCH_1" as const, touchCount: 1 };
    const { deps, replies } = setup([lead], { label: "positive", confidence: 0.9 });
    const rep = { type: "REPLY" as const, channel: "X" as const, handle: "ana_rcic", body: "sounds good" };
    const a = await applyReport(deps, rep, { haltChannel: vi.fn() });
    const b = await applyReport(deps, rep, { haltChannel: vi.fn() });
    expect(replies).toHaveLength(1);
    expect(a.ok && b.ok).toBe(true);
    expect(b.detail).toMatch(/duplicate/);
    expect(lead.state).toBe("CONVERSATION");

    const neg = { ...xLead(), id: "X2", consultantProfileId: "P2", externalHandle: "bob", state: "TOUCH_1" as const, touchCount: 1 };
    const s2 = setup([neg], { label: "negative", confidence: 0.95 });
    const nrep = { type: "REPLY" as const, channel: "X" as const, handle: "bob", body: "not for me, thanks" };
    await applyReport(s2.deps, nrep, { haltChannel: vi.fn() });
    await applyReport(s2.deps, nrep, { haltChannel: vi.fn() });
    expect(s2.replies).toHaveLength(1);
    expect(s2.deps.suppress).toHaveBeenCalledTimes(2); // suppression is idempotent and runs before the dedupe
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

  it("rejects LEAD_MATCHED for missing, claimed, inactive or suppressed profiles and invalid timezones", async () => {
    const signals = { postedAboutMarketing: true, soloOrSmallFirm: true, activeLast21Days: true, socialProfileComplete: true, hadProfileViews30d: false };
    const report = (timezone = TOR) => ({ type: "LEAD_MATCHED" as const, consultantProfileId: "P9", channel: "LINKEDIN" as const, handle: "in/x", matchConfidence: 0.95, timezone, signals });
    for (const bad of [{ exists: false }, { claimed: true }, { ciccActive: false }, { suppressed: true }]) {
      const { deps, created } = setup([], {}, { ...OK_ELIG, ...bad });
      const res = await applyReport(deps, report(), { haltChannel: vi.fn() });
      expect(res.ok).toBe(true);
      expect(created).toHaveLength(0);
    }
    const { deps, created } = setup([], {});
    expect((await applyReport(deps, report("Mars/Olympus"), { haltChannel: vi.fn() })).detail).toBe("invalid timezone");
    expect(created).toHaveLength(0);
  });

  it("never hands out more than the daily cap, counting yesterday's still-queued touch", async () => {
    const leads = Array.from({ length: 9 }, (_, i) => ({ ...xLead(), id: `X${i}`, consultantProfileId: `P${i}`, externalHandle: `h${i}`, score: 30 - i }));
    const { deps, touches } = setup(leads, {});
    touches.set("X8:1", { id: "t-old", leadId: "X8", step: 1, status: "QUEUED", body: "old body", channel: "X" });
    const tasks = await buildSocialTasks(deps, "X");
    expect(tasks.length).toBeLessThanOrEqual(5);
    expect(tasks.length).toBeGreaterThan(0);
  });

  it("only accepts TOUCH_RESULT for queued social touches", async () => {
    const lead = xLead();
    const { deps, touches } = setup([lead], {});
    touches.set("X1:1", { id: "tc", leadId: "X1", step: 1, status: "CANCELLED", body: "b", channel: "X" });
    touches.set("X1:2", { id: "te", leadId: "X1", step: 1, status: "QUEUED", body: "b", channel: "EMAIL" });
    expect((await applyReport(deps, { type: "TOUCH_RESULT", touchId: "tc", status: "SENT" }, { haltChannel: vi.fn() })).ok).toBe(false);
    expect((await applyReport(deps, { type: "TOUCH_RESULT", touchId: "te", status: "SENT" }, { haltChannel: vi.fn() })).ok).toBe(false);
    expect(lead.state).toBe("BACKLOG");
  });

  it("accepts UNCERTAIN as a TOUCH_RESULT status", () => {
    expect(workerReportSchema.safeParse({ type: "TOUCH_RESULT", touchId: "t", status: "UNCERTAIN", error: "x" }).success).toBe(true);
    expect(workerReportSchema.safeParse({ type: "TOUCH_RESULT", touchId: "t", status: "MAYBE" }).success).toBe(false);
  });

  it("requires email or handle on REPLY reports", () => {
    expect(workerReportSchema.safeParse({ type: "REPLY", channel: "X", body: "hi" }).success).toBe(false);
    expect(workerReportSchema.safeParse({ type: "REPLY", channel: "X", handle: "a", body: "hi" }).success).toBe(true);
  });

  it("re-hands all 5 outstanding queued touches and creates none when the cap is used up", async () => {
    const leads = Array.from({ length: 9 }, (_, i) => ({ ...xLead(), id: `X${i}`, consultantProfileId: `P${i}`, externalHandle: `h${i}`, score: 30 - i }));
    const { deps, touches } = setup(leads, {});
    for (const l of leads.slice(4)) touches.set(`${l.id}:1`, { id: `old-${l.id}`, leadId: l.id, step: 1, status: "QUEUED", body: "old", channel: "X" });
    const tasks = await buildSocialTasks(deps, "X");
    expect(tasks.map((t) => t.touchId).sort()).toEqual(leads.slice(4).map((l) => `old-${l.id}`).sort());
    expect(touches.size).toBe(5);
  });

  it("re-hands 3 outstanding queued touches plus at most 2 new ones", async () => {
    const leads = Array.from({ length: 9 }, (_, i) => ({ ...xLead(), id: `X${i}`, consultantProfileId: `P${i}`, externalHandle: `h${i}`, score: 30 - i }));
    const { deps, touches } = setup(leads, {});
    for (const l of leads.slice(6)) touches.set(`${l.id}:1`, { id: `old-${l.id}`, leadId: l.id, step: 1, status: "QUEUED", body: "old", channel: "X" });
    const tasks = await buildSocialTasks(deps, "X");
    expect(tasks).toHaveLength(5);
    expect(touches.size).toBe(5);
  });

  it("stops handing out when dry-run is switched on mid-run", async () => {
    const { deps } = setup([xLead()], {});
    let calls = 0;
    deps.settings = async () => ({ enabled: true, dryRun: ++calls > 1, channels: { LINKEDIN: true, X: true, EMAIL: false } });
    expect(await buildSocialTasks(deps, "X")).toEqual([]);
  });

  it("never re-hands a live QUEUED touch while dry-run is on", async () => {
    const lead = xLead();
    const fresh = { ...xLead(), id: "X2", consultantProfileId: "P2", externalHandle: "bob_rcic", score: 10 };
    const { deps, touches } = setup([lead, fresh], {});
    deps.settings = async () => ({ enabled: true, dryRun: true, channels: { LINKEDIN: true, X: true, EMAIL: false } });
    touches.set("X1:1", { id: "live-old", leadId: "X1", step: 1, status: "QUEUED", body: "old", channel: "X" });
    const tasks = await buildSocialTasks(deps, "X");
    expect(tasks.some((t) => t.touchId === "live-old")).toBe(false);
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.some((t) => t.leadId === "X2")).toBe(true);
    expect(tasks.every((t) => t.dryRun)).toBe(true);
    expect(touches.get("X1:1")!.status).toBe("QUEUED");
  });
});

describe("founder alert when a lead enters CONVERSATION", () => {
  const hooks = { haltChannel: vi.fn(async () => {}) };
  const live = () => ({ ...xLead(), state: "TOUCH_1" as const, touchCount: 1 });

  it.each(["positive", "question"])("a %s reply alerts once with channel, lead, contact, label, body and admin URL", async (label) => {
    const lead = live();
    const { deps } = setup([lead], { label, confidence: 0.92 });
    const alert = vi.fn(async (_s: string, _l: string[]) => {});
    deps.alert = alert;
    const body = `Sounds good, tell me more. ${"y".repeat(400)}`;
    const r = await applyReport(deps, { type: "REPLY", channel: "X", handle: "ana_rcic", body }, hooks);
    expect(r.ok).toBe(true);
    expect(lead.state).toBe("CONVERSATION");
    expect(alert).toHaveBeenCalledTimes(1);
    const text = alert.mock.calls[0][1].join("\n");
    for (const s of ["X", "X1", "ana_rcic", label, "0.92", body.slice(0, 300), "https://getverixa.com/dashboard/admin/outreach"]) expect(text).toContain(s);
    expect(text).not.toContain(body.slice(0, 301));
  });

  it("a duplicate reply does not alert again", async () => {
    const lead = live();
    const { deps } = setup([lead], { label: "positive", confidence: 0.9 });
    const alert = vi.fn(async () => {});
    deps.alert = alert;
    await applyReport(deps, { type: "REPLY", channel: "X", handle: "ana_rcic", body: "sounds good" }, hooks);
    await applyReport(deps, { type: "REPLY", channel: "X", handle: "ana_rcic", body: "sounds good" }, hooks);
    expect(alert).toHaveBeenCalledTimes(1);
  });

  it("a new reply from a lead already in CONVERSATION does not alert", async () => {
    const lead = { ...xLead(), state: "CONVERSATION" as const, touchCount: 1 };
    const { deps } = setup([lead], { label: "positive", confidence: 0.9 });
    const alert = vi.fn(async () => {});
    deps.alert = alert;
    await applyReport(deps, { type: "REPLY", channel: "X", handle: "ana_rcic", body: "one more thing" }, hooks);
    expect(alert).not.toHaveBeenCalled();
  });

  it.each([["negative", 0.95], ["auto_reply", 0.95]])("a %s reply does not alert", async (label, confidence) => {
    const lead = live();
    const { deps } = setup([lead], { label, confidence });
    const alert = vi.fn(async () => {});
    deps.alert = alert;
    await applyReport(deps, { type: "REPLY", channel: "X", handle: "ana_rcic", body: "away until Monday" }, hooks);
    expect(lead.state).not.toBe("CONVERSATION");
    expect(alert).not.toHaveBeenCalled();
  });

  it("an alert failure does not fail the report", async () => {
    const lead = live();
    const { deps } = setup([lead], { label: "positive", confidence: 0.9 });
    deps.alert = vi.fn(async () => { throw new Error("smtp down"); });
    const r = await applyReport(deps, { type: "REPLY", channel: "X", handle: "ana_rcic", body: "sounds good" }, hooks);
    expect(r).toEqual({ ok: true, detail: undefined });
    expect(lead.state).toBe("CONVERSATION");
  });
});
