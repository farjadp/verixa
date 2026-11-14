// src/lib/outreach/__tests__/engine.test.ts
import { describe, expect, it, vi } from "vitest";
import type { Llm } from "@/lib/content-pipeline/types";
import { applyReport, bounceTypeFrom, cancelScheduledEmails, handleEmailEvent, planEmailDay, type EngineDeps } from "../engine";
import type { LeadRow, OutreachRepo } from "../repo";
import type { LeadSnapshot } from "../types";

const TOR = "America/Toronto";
const NOW = new Date("2026-11-05T11:00:00Z"); // Thu 06:00 Toronto — daily cron time

interface MemoryOpts { noEmail?: Set<string>; failFirstScheduledWrite?: boolean; padEmail?: boolean; external?: { n: number }; afterCreate?: () => void }

function memoryRepo(leads: LeadRow[], opts: MemoryOpts = {}) {
  const touches: { id: string; leadId: string; step: number; status: string; externalMessageId?: string; scheduledFor?: Date; key: string; body: string }[] = [];
  let scheduledWrites = 0;
  const repo: OutreachRepo = {
    listLeads: async (c) => leads.filter((l) => !c || l.channel === c),
    getLead: async (id) => leads.find((l) => l.id === id) ?? null,
    findLeadByContact: async () => null,
    saveLead: async (id, s: LeadSnapshot) => { Object.assign(leads.find((l) => l.id === id)!, s); },
    createLead: async () => false,
    countLeadsCreatedToday: async () => 8,
    countTouchesToday: async () => touches.filter((t) => !["CANCELLED", "FAILED", "DRY_RUN"].includes(t.status)).length + (opts.external?.n ?? 0),
    getProfileEligibility: async () => ({ exists: true, claimed: false, ciccActive: true, suppressed: false }),
    findDiscoveryCandidates: async () => [],
    getComposeContext: async (leadId) => ({ consultantProfileId: leadId, email: opts.noEmail?.has(leadId) ? null : opts.padEmail ? `  ${leadId}@firm.ca \n` : `${leadId}@firm.ca`, firstName: "Sam", city: null, licenseNumber: `R${leadId}`, profileViews30d: 0, externalHandle: null }),
    createTouch: async (t) => {
      const key = `${t.leadId}:${t.step}:${t.cycle}${t.status === "DRY_RUN" ? ":dry" : ""}`;
      const ex = touches.find((x) => x.key === key);
      if (ex && (ex.status === "CANCELLED" || (ex.status === "FAILED" && !ex.externalMessageId))) {
        Object.assign(ex, { status: t.status, body: t.body });
        return { id: ex.id, created: true, status: ex.status, body: ex.body };
      }
      if (ex) return { id: ex.id, created: false, status: ex.status, body: ex.body };
      const row = { id: `t${touches.length}`, leadId: t.leadId, step: t.step, status: t.status, key, body: t.body };
      touches.push(row);
      opts.afterCreate?.();
      return { id: row.id, created: true, status: row.status, body: row.body };
    },
    updateTouch: async (id, p) => {
      if (p.status === "SCHEDULED" && opts.failFirstScheduledWrite && scheduledWrites++ === 0) throw new Error("db down");
      Object.assign(touches.find((t) => t.id === id)!, p);
    },
    listQueuedTouches: async () => [],
    getTouch: async () => null,
    findTouchByExternalId: async () => null,
    findEmailTouchByMessageIds: async (ids) => {
      const t = touches.find((x) => x.externalMessageId && ids.includes(x.externalMessageId));
      return t ? { id: t.id, leadId: t.leadId } : null;
    },
    listFutureScheduledEmailTouches: async (now) => touches.filter((t) => t.externalMessageId && t.scheduledFor! > now && !["CANCELLED", "SENT"].includes(t.status)).map((t) => ({ id: t.id, leadId: t.leadId, step: t.step as 1, externalMessageId: t.externalMessageId! })),
    recordReply: async () => true,
    negativeStats: async () => ({ touches: 0, negatives: 0 }),
    listInvitedLeads: async () => [],
    getSendCheck: async () => null,
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
    inboxReadAt: async () => new Date("2026-11-04T15:00:00Z"),
    alertConfigured: true,
    ...over,
  };
}

describe("planEmailDay", () => {
  it("schedules the top 10 (email cap) inside 08:00–13:00 local with 5–13 minute gaps and advances state", async () => {
    const leads = Array.from({ length: 12 }, (_, i) => backlog(`L${i}`, 13 + i));
    const { repo, touches } = memoryRepo(leads);
    const d = deps(repo);
    const res = await planEmailDay(d);
    expect(res).toEqual({ status: "ok", scheduled: 10, dryRun: 0, failed: 0 });
    const times = (d.email.send as ReturnType<typeof vi.fn>).mock.calls.map((c) => (c[1] as Date).getTime());
    expect(new Date(times[0]).toISOString()).toBe("2026-11-05T13:07:00.000Z"); // 08:00 + round(0.5*13) min
    for (let i = 1; i < times.length; i++) expect((times[i] - times[i - 1]) / 60000).toBe(9); // 5 + 0.5*8
    expect(leads.filter((l) => l.state === "TOUCH_1").map((l) => l.id).sort()).toEqual(["L10", "L11", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L9"]);
    expect(touches.every((t) => t.status === "SCHEDULED")).toBe(true);
  });

  it("never schedules two leads in different zones less than 5 minutes apart", async () => {
    const van = (id: string, score: number): LeadRow => ({ ...backlog(id, score), timezone: "America/Vancouver" });
    const leads = [van("V1", 20), backlog("T1", 19), van("V2", 18), backlog("T2", 17)];
    const { repo } = memoryRepo(leads);
    const d = deps(repo);
    await planEmailDay(d);
    const times = (d.email.send as ReturnType<typeof vi.fn>).mock.calls.map((c) => (c[1] as Date).getTime()).sort((a, b) => a - b);
    expect(times.length).toBe(4);
    for (let i = 1; i < times.length; i++) expect((times[i] - times[i - 1]) / 60000).toBeGreaterThanOrEqual(5);
  });

  it("respects capacity already used today (9 counted -> at most 1 new send)", async () => {
    const leads = Array.from({ length: 6 }, (_, i) => backlog(`L${i}`, 20 + i));
    const external = { n: 9 };
    const { repo } = memoryRepo(leads, { external });
    const d = deps(repo);
    expect((await planEmailDay(d)).scheduled).toBe(1);
  });

  it("stops mid-loop when an overlapping run takes the remaining capacity", async () => {
    const leads = Array.from({ length: 8 }, (_, i) => backlog(`L${i}`, 20 + i));
    const external = { n: 0 };
    const { repo } = memoryRepo(leads, { external, afterCreate: () => { external.n = 9; } });
    const d = deps(repo);
    const res = await planEmailDay(d);
    expect(res.scheduled).toBe(1); // 1 ours + 9 from the rival = 10, so the loop stops
    expect(d.email.send).toHaveBeenCalledTimes(1);
  });

  it("ambiguous send error -> UNCERTAIN, alert raised, never re-sent next day", async () => {
    const leads = [backlog("A", 20)];
    const { repo, touches } = memoryRepo(leads);
    const alert = vi.fn(async () => {});
    const d = deps(repo, { alert });
    vi.mocked(d.email.send).mockRejectedValueOnce(Object.assign(new Error("timeout"), { statusCode: 504 }));
    expect(await planEmailDay(d)).toMatchObject({ scheduled: 0, failed: 1 });
    expect(touches[0].status).toBe("UNCERTAIN");
    expect(alert).toHaveBeenCalledTimes(1);
    expect(leads[0].state).toBe("BACKLOG");
    // next day: the row blocks a re-send
    const tomorrow = deps(repo, { now: () => new Date("2026-11-09T11:00:00Z") });
    await planEmailDay(tomorrow);
    expect(tomorrow.email.send).not.toHaveBeenCalled();
    expect(touches).toHaveLength(1);
  });

  it("error without a status code is treated as ambiguous", async () => {
    const { repo, touches } = memoryRepo([backlog("A", 20)]);
    const d = deps(repo);
    vi.mocked(d.email.send).mockRejectedValueOnce(new Error("socket hang up"));
    await planEmailDay(d);
    expect(touches[0].status).toBe("UNCERTAIN");
  });

  it("definite 4xx rejection -> FAILED and the touch is reused next day", async () => {
    const leads = [backlog("A", 20)];
    const { repo, touches } = memoryRepo(leads);
    const alert = vi.fn(async () => {});
    const d = deps(repo, { alert });
    vi.mocked(d.email.send).mockRejectedValueOnce(Object.assign(new Error("invalid to"), { statusCode: 422 }));
    await planEmailDay(d);
    expect(touches[0].status).toBe("FAILED");
    expect(alert).not.toHaveBeenCalled();
    const tomorrow = deps(repo, { now: () => new Date("2026-11-09T11:00:00Z") });
    expect((await planEmailDay(tomorrow)).scheduled).toBe(1);
    expect(touches).toHaveLength(1);
    expect(touches[0].status).toBe("SCHEDULED");
  });

  it("passes the touch id as the idempotency key and sends to the trimmed address", async () => {
    const { repo } = memoryRepo([backlog("A", 20)], { padEmail: true });
    const d = deps(repo);
    const build = vi.spyOn(d.email, "build");
    await planEmailDay(d);
    expect(vi.mocked(d.email.send).mock.calls[0][2]).toBe(`t0:${(vi.mocked(d.email.send).mock.calls[0][1] as Date).getTime()}`);
    expect(build.mock.calls[0][0].to).toBe("A@firm.ca");
  });

  it("a reused touch gets a different idempotency key than its first attempt", async () => {
    const leads = [backlog("A", 20)];
    const { repo, touches } = memoryRepo(leads);
    const d1 = deps(repo);
    vi.mocked(d1.email.send).mockRejectedValueOnce(Object.assign(new Error("invalid to"), { statusCode: 422 }));
    await planEmailDay(d1);
    expect(touches[0].status).toBe("FAILED");
    const d2 = deps(repo, { now: () => new Date("2026-11-09T11:00:00Z") });
    await planEmailDay(d2);
    const k1 = vi.mocked(d1.email.send).mock.calls[0][2];
    const k2 = vi.mocked(d2.email.send).mock.calls[0][2];
    expect(k1).toMatch(/^t0:/);
    expect(k2).toMatch(/^t0:/);
    expect(k2).not.toBe(k1);
  });

  it("invalid_idempotent_request is a definite rejection; concurrent_idempotent_requests stays ambiguous", async () => {
    const run = async (code: string) => {
      const { repo, touches } = memoryRepo([backlog("A", 20)]);
      const d = deps(repo);
      vi.mocked(d.email.send).mockRejectedValueOnce(Object.assign(new Error("x"), { statusCode: 409, code }));
      await planEmailDay(d);
      return touches[0].status;
    };
    expect(await run("invalid_idempotent_request")).toBe("FAILED");
    expect(await run("concurrent_idempotent_requests")).toBe("UNCERTAIN");
  });

  it("UNCERTAIN update carries scheduledFor", async () => {
    const { repo, touches } = memoryRepo([backlog("A", 20)]);
    const d = deps(repo);
    vi.mocked(d.email.send).mockRejectedValueOnce(new Error("timeout"));
    await planEmailDay(d);
    expect(touches[0].status).toBe("UNCERTAIN");
    expect(touches[0].scheduledFor).toBeInstanceOf(Date);
  });

  it("a config error is a definite failure: FAILED, no alert", async () => {
    const { repo, touches } = memoryRepo([backlog("A", 20)]);
    const alert = vi.fn(async () => {});
    const d = deps(repo, { alert });
    vi.mocked(d.email.send).mockRejectedValueOnce(Object.assign(new Error("RESEND_API_KEY is unset"), { name: "OutreachConfigError" }));
    await planEmailDay(d);
    expect(touches[0].status).toBe("FAILED");
    expect(alert).not.toHaveBeenCalled();
  });

  it("alerts when the email was sent but the SCHEDULED write failed twice", async () => {
    const { repo } = memoryRepo([backlog("A", 20)], { failFirstScheduledWrite: true });
    const alert = vi.fn(async () => {});
    const d = deps(repo, { alert });
    const orig = repo.updateTouch;
    let fails = 0;
    repo.updateTouch = async (id, p) => { if (p.status === "SCHEDULED" && fails++ < 2) throw new Error("db down"); return orig(id, p); };
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    await planEmailDay(d);
    err.mockRestore();
    expect(alert).toHaveBeenCalledTimes(1);
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
    expect(await cancelScheduledEmails(d)).toEqual({ cancelled: 1, failed: 0 });
    expect(d.email.cancel).toHaveBeenCalledWith("re_0");
    expect(leads[0].state).toBe("BACKLOG");
  });
});

describe("cancelScheduledEmails failures", () => {
  it("counts a failed cancel and leaves that touch SCHEDULED", async () => {
    const leads = [backlog("A", 20), backlog("B", 19)];
    const { repo, touches } = memoryRepo(leads);
    const d = deps(repo);
    await planEmailDay(d);
    vi.mocked(d.email.cancel).mockImplementation(async (id: string) => { if (id === "re_0") throw new Error("resend 500"); });
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await cancelScheduledEmails(d)).toEqual({ cancelled: 1, failed: 1 });
    err.mockRestore();
    expect(touches.filter((x) => x.status === "SCHEDULED")).toHaveLength(1);
    expect(touches.find((x) => x.externalMessageId === "re_0")!.status).toBe("SCHEDULED");
  });
});

describe("post-send failure and dead touches", () => {
  it("keeps a sent touch SCHEDULED when the first save fails, so the kill switch still cancels it", async () => {
    const leads = [backlog("A", 20)];
    const { repo, touches } = memoryRepo(leads, { failFirstScheduledWrite: true });
    const d = deps(repo);
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await planEmailDay(d)).toEqual({ status: "ok", scheduled: 1, dryRun: 0, failed: 0 });
    err.mockRestore();
    expect(touches[0].status).toBe("SCHEDULED");
    expect(await cancelScheduledEmails(d)).toEqual({ cancelled: 1, failed: 0 });
    expect(d.email.cancel).toHaveBeenCalledWith("re_0");
  });

  it("re-uses a CANCELLED touch instead of being blocked by it", async () => {
    const leads = [backlog("A", 20)];
    const { repo, touches } = memoryRepo(leads);
    const d = deps(repo);
    await planEmailDay(d);
    await cancelScheduledEmails(d);
    expect(touches[0].status).toBe("CANCELLED");
    expect(await planEmailDay(d)).toEqual({ status: "ok", scheduled: 1, dryRun: 0, failed: 0 });
    expect(touches).toHaveLength(1);
    expect(touches[0].status).toBe("SCHEDULED");
  });

  it("skipped leads do not eat the daily cap", async () => {
    const leads = Array.from({ length: 8 }, (_, i) => backlog(`L${i}`, 30 - i));
    const { repo } = memoryRepo(leads, { noEmail: new Set(["L0", "L1", "L2", "L3", "L4"]) });
    const d = deps(repo);
    expect(await planEmailDay(d)).toEqual({ status: "ok", scheduled: 3, dryRun: 0, failed: 0 });
  });

  it("suppresses a lead that has no email instead of failing it every day", async () => {
    const leads = [backlog("A", 20)];
    const { repo } = memoryRepo(leads, { noEmail: new Set(["A"]) });
    const d = deps(repo);
    await planEmailDay(d);
    expect(d.suppress).toHaveBeenCalledWith("A", "no_email");
    expect(leads[0].state).toBe("OPTED_OUT");
  });

  it("stops sending when the kill switch is flipped mid-run", async () => {
    const leads = [backlog("A", 20), backlog("B", 19)];
    const { repo } = memoryRepo(leads);
    let calls = 0;
    const d = deps(repo, { settings: async () => ({ enabled: ++calls <= 1, dryRun: false, channels: { EMAIL: true, LINKEDIN: false, X: false } }) });
    const res = await planEmailDay(d);
    expect(res.scheduled).toBe(0);
    expect(d.email.send).not.toHaveBeenCalled();
  });
});

describe("handleEmailEvent", () => {
  it("suppresses the lead on bounce and marks SENT on delivery", async () => {
    const lead = { ...backlog("A", 20), state: "TOUCH_1" as const, touchCount: 1 };
    const { repo } = memoryRepo([lead]);
    repo.findTouchByExternalId = async (id) => (id === "re_9" ? { id: "t9", leadId: "A", step: 1, sentAt: null } : null);
    const updates: object[] = [];
    repo.updateTouch = async (_id, p) => { updates.push(p); };
    const d = deps(repo);
    expect(await handleEmailEvent(d, "re_unknown", "BOUNCED")).toBe(false);
    expect(await handleEmailEvent(d, "re_9", "DELIVERED")).toBe(true);
    expect(updates[0]).toMatchObject({ status: "SENT", sentAt: NOW });
    await handleEmailEvent(d, "re_9", "BOUNCED");
    expect(lead.state).toBe("OPTED_OUT");
    expect(d.suppress).toHaveBeenCalledWith("A", "bounced", { email: "A@firm.ca" });
  });

  it("stores bounce type, reason and event time on the touch, and marks it SENT", async () => {
    const { repo } = memoryRepo([{ ...backlog("A", 20), state: "TOUCH_1" as const, touchCount: 1 }]);
    repo.findTouchByExternalId = async () => ({ id: "t9", leadId: "A", step: 1, sentAt: null });
    const updates: Record<string, unknown>[] = [];
    repo.updateTouch = async (_id, p) => { updates.push({ ...p }); };
    const at = new Date("2026-11-05T12:30:00Z");
    await handleEmailEvent(deps(repo), "re_9", "BOUNCED", { at, bounceType: "hard", bounceReason: "550 mailbox unavailable" });
    expect(updates[0]).toEqual({ status: "SENT", sentAt: NOW, bouncedAt: at, bounceType: "hard", bounceReason: "550 mailbox unavailable" });
  });

  it("stores the complaint time", async () => {
    const { repo } = memoryRepo([{ ...backlog("A", 20), state: "TOUCH_1" as const, touchCount: 1 }]);
    repo.findTouchByExternalId = async () => ({ id: "t9", leadId: "A", step: 1, sentAt: NOW });
    const updates: Record<string, unknown>[] = [];
    repo.updateTouch = async (_id, p) => { updates.push({ ...p }); };
    await handleEmailEvent(deps(repo), "re_9", "COMPLAINED");
    expect(updates[0]).toEqual({ status: "SENT", complainedAt: NOW });
  });

  it("maps Resend bounce types to hard/soft and leaves unknown ones unclassified", () => {
    expect(bounceTypeFrom("Permanent")).toBe("hard");
    expect(bounceTypeFrom("Transient")).toBe("soft");
    expect(bounceTypeFrom("Undetermined")).toBeNull();
    expect(bounceTypeFrom(undefined)).toBeNull();
  });

  it("does not overwrite an existing sentAt on delivery", async () => {
    const { repo } = memoryRepo([{ ...backlog("A", 20), state: "TOUCH_1" as const, touchCount: 1 }]);
    const sentAt = new Date("2026-11-05T12:00:00Z");
    repo.findTouchByExternalId = async () => ({ id: "t9", leadId: "A", step: 1, sentAt });
    const updates: Record<string, unknown>[] = [];
    repo.updateTouch = async (_id, p) => { updates.push({ ...p }); };
    await handleEmailEvent(deps(repo), "re_9", "DELIVERED");
    expect(updates[0]).toEqual({ status: "SENT", deliveredAt: NOW });
  });
});

describe("applyReport REPLY on EMAIL", () => {
  const hooks = { haltChannel: vi.fn(async () => {}) };
  function setup() {
    const a = { ...backlog("A", 20), state: "TOUCH_1" as const, touchCount: 1 };
    const b = { ...backlog("B", 20), state: "ARCHIVED" as const, touchCount: 3 };
    const { repo, touches } = memoryRepo([a, b]);
    touches.push({ id: "tB", leadId: "B", step: 1, status: "SENT", externalMessageId: "re_9", key: "B:1:0", body: "x" });
    repo.findLeadByContact = async ({ email }) => (email === "a@firm.ca" ? a : null);
    const recorded: { leadId: string }[] = [];
    repo.recordReply = async (r) => { recorded.push(r); return true; };
    const alert = vi.fn(async () => {});
    const llm: Llm = { json: (async () => ({ label: "question", confidence: 0.9 })) as never };
    return { d: deps(repo, { alert, llm }), recorded, alert };
  }

  it("a thread-header match wins over a different From address (and finds a terminal-state lead)", async () => {
    const s = setup();
    const r = await applyReport(s.d, { type: "REPLY", channel: "EMAIL", email: "a@firm.ca", body: "tell me more", messageIds: ["re_9"] }, hooks);
    expect(r.ok).toBe(true);
    expect(s.recorded.map((x) => x.leadId)).toEqual(["B"]);
  });

  it.each([["<re_9>"], ["<re_9@resend.dev>"], ["re_9@resend.dev"], [" <re_9@resend.dev> "]])("tolerates brackets and the stored id as the local part: %s", async (id) => {
    const s = setup();
    await applyReport(s.d, { type: "REPLY", channel: "EMAIL", email: "other@x.ca", body: "tell me more", messageIds: ["unrelated@mail.gmail.com", id] }, hooks);
    expect(s.recorded.map((x) => x.leadId)).toEqual(["B"]);
  });

  it("falls back to the From address when no header matches", async () => {
    const s = setup();
    await applyReport(s.d, { type: "REPLY", channel: "EMAIL", email: "a@firm.ca", body: "tell me more", messageIds: ["nope@mail.gmail.com"] }, hooks);
    expect(s.recorded.map((x) => x.leadId)).toEqual(["A"]);
  });

  it("an unmatched opt-out alerts the founder with the sender and the start of the body", async () => {
    const s = setup();
    const body = `Please stop emailing me. ${"x".repeat(400)}`;
    const r = await applyReport(s.d, { type: "REPLY", channel: "EMAIL", email: "stranger@x.ca", body, messageIds: ["nope@x"] }, hooks);
    expect(r).toEqual({ ok: true, detail: "skipped: no lead for contact (opt-out alerted)" });
    expect(s.alert).toHaveBeenCalledTimes(1);
    const [, lines] = s.alert.mock.calls[0] as unknown as [string, string[]];
    const text = lines.join("\n");
    expect(text).toContain("stranger@x.ca");
    expect(text).toContain(body.slice(0, 200));
    expect(text).not.toContain(body.slice(0, 201));
    expect(s.recorded).toEqual([]);
  });

  it("an unmatched reply that is not an opt-out raises no alert", async () => {
    const s = setup();
    const r = await applyReport(s.d, { type: "REPLY", channel: "EMAIL", email: "stranger@x.ca", body: "Who is this?" }, hooks);
    expect(r).toEqual({ ok: true, detail: "skipped: no lead for contact" });
    expect(s.alert).not.toHaveBeenCalled();
  });
});

describe("workerReportSchema messageIds", () => {
  it("accepts up to 20 ids of up to 300 chars and rejects more", async () => {
    const { workerReportSchema } = await import("../engine");
    const base = { type: "REPLY", channel: "EMAIL", email: "a@b.ca", body: "hi" };
    expect(workerReportSchema.safeParse({ ...base, messageIds: Array.from({ length: 20 }, (_, i) => `id${i}`) }).success).toBe(true);
    expect(workerReportSchema.safeParse({ ...base, messageIds: Array.from({ length: 21 }, (_, i) => `id${i}`) }).success).toBe(false);
    expect(workerReportSchema.safeParse({ ...base, messageIds: ["a".repeat(301)] }).success).toBe(false);
  });
});

describe("applyReport REPLY auto-reply header", () => {
  const hooks = { haltChannel: vi.fn(async () => {}) };
  async function run(autoReply: boolean | undefined) {
    const a = { ...backlog("A", 20), state: "TOUCH_1" as const, touchCount: 1 };
    const { repo } = memoryRepo([a]);
    repo.findLeadByContact = async () => a;
    const recorded: { label: string }[] = [];
    repo.recordReply = async (r) => { recorded.push(r); return true; };
    const llm: Llm = { json: (async () => ({ label: "auto_reply", confidence: 0.5 })) as never };
    const { workerReportSchema } = await import("../engine");
    const report = workerReportSchema.parse({ type: "REPLY", channel: "EMAIL", email: "a@firm.ca", body: "Thanks for your email", ...(autoReply === undefined ? {} : { autoReply }) });
    await applyReport(deps(repo, { llm }), report, hooks);
    return recorded.map((r) => r.label);
  }

  it("keeps a low-confidence auto_reply label when the worker saw an auto-reply header", async () => {
    expect(await run(true)).toEqual(["auto_reply"]);
  });

  it("relabels it as question without the header", async () => {
    expect(await run(undefined)).toEqual(["question"]);
    expect(await run(false)).toEqual(["question"]);
  });
});

describe("planEmailDay holds follow-ups while the inbox is unread", () => {
  const due = (id: string): LeadRow => ({ ...backlog(id, 20), state: "TOUCH_1", touchCount: 1, nextActionAt: new Date("2026-11-04T05:00:00Z") });
  const FRESH = new Date("2026-11-04T15:00:00Z"); // Wed: within 2 active days of Thu
  const STALE = new Date("2026-11-02T15:00:00Z"); // Mon: 3 active days before Thu

  it.each([["never read", null], ["read on Monday", STALE]])("holds step 2 when the inbox was %s, still sends step 1", async (_n, readAt) => {
    const leads = [due("F1"), backlog("B1", 10)];
    const { repo, touches } = memoryRepo(leads);
    const d = deps(repo, { inboxReadAt: async () => readAt });
    const res = await planEmailDay(d);
    expect(res).toMatchObject({ status: "ok", scheduled: 1, followUpsHeld: 1 });
    expect(res.detail).toMatch(/inbox not read since/);
    expect(touches.map((t) => [t.leadId, t.step])).toEqual([["B1", 1]]);
    expect(leads[0].state).toBe("TOUCH_1");
  });

  it("held follow-ups do not crowd out new leads", async () => {
    const leads = [...Array.from({ length: 20 }, (_, i) => due(`F${i}`)), backlog("B1", 10)];
    const { repo, touches } = memoryRepo(leads);
    const res = await planEmailDay(deps(repo, { inboxReadAt: async () => null }));
    expect(res).toMatchObject({ scheduled: 1, followUpsHeld: 20 });
    expect(touches.map((t) => t.leadId)).toEqual(["B1"]);
  });

  it("sends step 2 when the inbox was read recently", async () => {
    const leads = [due("F1")];
    const { repo, touches } = memoryRepo(leads);
    const res = await planEmailDay(deps(repo, { inboxReadAt: async () => FRESH }));
    expect(res).toEqual({ status: "ok", scheduled: 1, dryRun: 0, failed: 0 });
    expect(touches.map((t) => [t.leadId, t.step])).toEqual([["F1", 2]]);
  });
});

describe("planEmailDay without founder alerts configured", () => {
  it("treats outreach as disabled even when the flags are on, and composes/sends nothing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const repo = { listLeads: vi.fn(), countTouchesToday: vi.fn() } as unknown as OutreachRepo;
    const d = deps(repo, { alertConfigured: false });
    const res = await planEmailDay(d);
    expect(res.status).toBe("disabled");
    expect(res.detail).toMatch(/OUTREACH_ALERT_EMAIL/);
    expect(repo.listLeads).not.toHaveBeenCalled();
    expect(d.email.send).not.toHaveBeenCalled();
    expect(warn.mock.calls.some((c) => String(c[0]).includes("OUTREACH_ALERT_EMAIL"))).toBe(true);
    warn.mockRestore();
  });
});

describe("touch 1 by email uses the fixed intro template", () => {
  it("sends the branded intro without calling the model", async () => {
    const leads = [backlog("L1", 20)];
    const { repo } = memoryRepo(leads);
    const llmJson = vi.fn(async () => { throw new Error("model must not be called for touch 1"); });
    const build = vi.fn((i: { to: string; subject: string; body: string; html?: string }) => ({ from: "f", to: i.to, replyTo: "r", subject: i.subject, text: i.body, html: i.html ?? i.body, headers: {} }));
    const d = deps(repo, { llm: { json: llmJson as never } });
    d.email = { ...d.email, build };
    expect((await planEmailDay(d)).scheduled).toBe(1);
    expect(llmJson).not.toHaveBeenCalled();
    const built = build.mock.calls[0][0];
    expect(built.subject).toBe("Your CICC listing is on Verixa, Sam");
    expect(built.html).toContain("Claim your profile");
  });
});
