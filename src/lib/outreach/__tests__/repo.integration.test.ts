// Opt-in Prisma integration check for the outreach repo layer (raw SQL, reuse race, caps, stats).
//
// NEVER runs in `npm test`. It needs a THROWAWAY Neon branch that already has the outreach
// migration applied. See docs/superpowers/outreach-integration-check.md for the exact steps.
//
//   OUTREACH_IT_DATABASE_URL=<branch pooled url> OUTREACH_IT_DIRECT_URL=<branch direct url> \
//   OUTREACH_IT_CONFIRM_THROWAWAY=yes npm run test:outreach-db
//
// Every row it creates is tagged (license "ITOUT-…", email "@it-outreach.test") and deleted afterwards.
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const URL = process.env.OUTREACH_IT_DATABASE_URL;
const DIRECT = process.env.OUTREACH_IT_DIRECT_URL ?? URL;
const CONFIRMED = process.env.OUTREACH_IT_CONFIRM_THROWAWAY === "yes";
const enabled = Boolean(URL && CONFIRMED);

const TAG = `ITOUT-${Date.now().toString(36)}`;
const MAIL = "@it-outreach.test";

function hostOf(u: string): string {
  try { return new globalThis.URL(u.replace(/^postgres(ql)?:/, "http:")).hostname; } catch { return ""; }
}

/** Refuse to run against any host named in the project's own env files (the live DB). */
function assertNotLive(target: string) {
  const targetHost = hostOf(target);
  for (const f of [".env", ".env.local", ".env.production", ".env.vercel"]) {
    let text = "";
    try { text = readFileSync(path.resolve(process.cwd(), f), "utf8"); } catch { continue; }
    for (const m of text.matchAll(/^(?:DATABASE_URL|DIRECT_URL)=["']?([^"'\n]+)/gm)) {
      if (hostOf(m[1]) === targetHost) {
        throw new Error(`Refusing to run: ${f} already points at host ${targetHost}. Use a separate Neon branch.`);
      }
    }
  }
}

describe.skipIf(!enabled)("outreach repo — real Postgres", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let repo: any;
  const profileIds: string[] = [];
  const userIds: string[] = [];
  let seq = 0;

  async function mkProfile(over: Record<string, unknown> = {}) {
    const n = ++seq;
    const p = await prisma.consultantProfile.create({
      data: {
        fullName: `Test Person${n} Lastname`, slug: `${TAG}-${n}`.toLowerCase(), licenseNumber: `${TAG}-${n}`,
        status: "Yes", province: "Ontario", country: "Canada", city: "Toronto",
        rawEmail: `p${n}-${TAG}${MAIL}`.toLowerCase(), ...over,
      },
    });
    profileIds.push(p.id);
    return p;
  }
  const snap = (over = {}) => ({ state: "BACKLOG", channel: "EMAIL", touchCount: 0, nextActionAt: null, backlogSince: new Date(), recontactUsed: false, timezone: "America/Toronto", ...over });
  async function mkLead(profileId: string, over: Record<string, unknown> = {}) {
    return prisma.outreachLead.create({ data: { consultantProfileId: profileId, channel: "EMAIL", state: "BACKLOG", ...over } });
  }
  const touchInput = (leadId: string, over = {}) => ({ leadId, channel: "EMAIL", step: 1, cycle: 0, subject: "s", body: "b", status: "QUEUED", ...over });

  beforeAll(async () => {
    assertNotLive(URL!);
    process.env.DATABASE_URL = URL;
    process.env.DIRECT_URL = DIRECT;
    ({ prisma } = await import("@/lib/prisma"));
    ({ prismaRepo: repo } = await import("../repo"));
    // The migration must already be applied to this branch.
    await prisma.$queryRaw`SELECT 1 FROM "OutreachLead" LIMIT 1`;
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.analyticsEvent.deleteMany({ where: { consultantId: { in: profileIds } } });
    await prisma.emailUnsubscribe.deleteMany({ where: { email: { endsWith: MAIL } } });
    await prisma.consultantProfile.deleteMany({ where: { id: { in: profileIds } } }); // cascades leads/touches/replies/suppression
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it("createLead: first insert wins, second is a no-op (one person, one lead)", async () => {
    const p = await mkProfile();
    const input = { consultantProfileId: p.id, snapshot: snap(), score: 13, externalHandle: null, matchConfidence: null };
    expect(await repo.createLead(input)).toBe(true);
    expect(await repo.createLead(input)).toBe(false);
  });

  it("createTouch: idempotent; dead rows (CANCELLED / FAILED without message id) are reused exactly once under a race", async () => {
    const p = await mkProfile();
    const lead = await mkLead(p.id);
    const first = await repo.createTouch(touchInput(lead.id));
    expect(first.created).toBe(true);
    const again = await repo.createTouch(touchInput(lead.id, { body: "different" }));
    expect(again).toMatchObject({ id: first.id, created: false, body: "b" });

    // CANCELLED row is reusable; two overlapping callers → exactly one winner, same row.
    await repo.updateTouch(first.id, { status: "CANCELLED" });
    const [a, b] = await Promise.all([
      repo.createTouch(touchInput(lead.id, { body: "retry-a" })),
      repo.createTouch(touchInput(lead.id, { body: "retry-b" })),
    ]);
    expect(a.id).toBe(first.id);
    expect(b.id).toBe(first.id);
    expect([a.created, b.created].filter(Boolean)).toHaveLength(1);

    // FAILED with a provider message id is NOT dead (it may have gone out).
    const lead2 = await mkLead((await mkProfile()).id);
    const t2 = await repo.createTouch(touchInput(lead2.id));
    await repo.updateTouch(t2.id, { status: "FAILED", externalMessageId: "msg_1" });
    expect((await repo.createTouch(touchInput(lead2.id))).created).toBe(false);

    // FAILED without one is dead; SENT / UNCERTAIN are never reused.
    const lead3 = await mkLead((await mkProfile()).id);
    const t3 = await repo.createTouch(touchInput(lead3.id));
    await repo.updateTouch(t3.id, { status: "FAILED" });
    expect((await repo.createTouch(touchInput(lead3.id))).created).toBe(true);
    await repo.updateTouch(t3.id, { status: "UNCERTAIN" });
    expect((await repo.createTouch(touchInput(lead3.id))).created).toBe(false);
  });

  it("createTouch: a FAILED social touch is never revived (CANCELLED still is)", async () => {
    const lead = await mkLead((await mkProfile()).id, { channel: "X" });
    const t = await repo.createTouch(touchInput(lead.id, { channel: "X" }));
    await repo.updateTouch(t.id, { status: "FAILED", error: "no Connect option" });
    expect((await repo.createTouch(touchInput(lead.id, { channel: "X", body: "new body" }))).created).toBe(false);
    await repo.updateTouch(t.id, { status: "CANCELLED" });
    expect((await repo.createTouch(touchInput(lead.id, { channel: "X", body: "new body" }))).created).toBe(true);
  });

  it("createTouch: dry-run rows are keyed per day", async () => {
    const lead = await mkLead((await mkProfile()).id);
    const d1 = await repo.createTouch(touchInput(lead.id, { status: "DRY_RUN", dryRunDay: "2026-11-10" }));
    const d2 = await repo.createTouch(touchInput(lead.id, { status: "DRY_RUN", dryRunDay: "2026-11-11" }));
    expect(d1.id).not.toBe(d2.id);
    expect((await repo.createTouch(touchInput(lead.id, { status: "DRY_RUN", dryRunDay: "2026-11-10" }))).created).toBe(false);
  });

  it("countTouchesToday: counts today's sends, future-scheduled, queued, uncertain; ignores old/cancelled/failed", async () => {
    const now = new Date();
    const before = await repo.countTouchesToday("EMAIL", now);
    const old = new Date(now.getTime() - 3 * 86_400_000);
    const future = new Date(now.getTime() + 3_600_000);
    const mk = async (step: number, data: Record<string, unknown>) => {
      const lead = await mkLead((await mkProfile()).id);
      await prisma.outreachTouch.create({ data: { leadId: lead.id, channel: "EMAIL", step, body: "b", idempotencyKey: `${lead.id}:${step}:0`, ...data } });
    };
    await mk(1, { status: "SENT", sentAt: now });            // counts
    await mk(1, { status: "SENT", sentAt: old });            // no
    await mk(1, { status: "SCHEDULED", scheduledFor: future }); // counts
    await mk(1, { status: "QUEUED" });                       // counts
    await mk(1, { status: "UNCERTAIN" });                    // counts (created today)
    await mk(1, { status: "CANCELLED", scheduledFor: future }); // no
    await mk(1, { status: "FAILED" });                       // no
    expect((await repo.countTouchesToday("EMAIL", now)) - before).toBe(4);
    expect(await repo.countTouchesToday("X", now)).toBeGreaterThanOrEqual(0);
  });

  it("findDiscoveryCandidates: only unclaimed, active, emailed, Canadian, uncontacted, unsuppressed profiles", async () => {
    const ok = await mkProfile({ province: "BC" });
    const claimedUser = await prisma.user.create({ data: { email: `claimed-${TAG}${MAIL}`.toLowerCase() } });
    userIds.push(claimedUser.id);
    const claimed = await mkProfile({ userId: claimedUser.id });
    const noEmail = await mkProfile({ rawEmail: null });
    const inactive = await mkProfile({ status: "No" });
    const usa = await mkProfile({ country: "United States", province: "NY" });
    const noProv = await mkProfile({ province: null });
    const hasLead = await mkProfile(); await mkLead(hasLead.id);
    const suppressed = await mkProfile(); await prisma.outreachSuppression.create({ data: { consultantProfileId: suppressed.id, reason: "manual" } });
    const unsub = await mkProfile(); await prisma.emailUnsubscribe.create({ data: { email: unsub.rawEmail, reason: "user_request" } });
    const spaced = await mkProfile({ status: " active ", province: "ON" });
    await prisma.analyticsEvent.createMany({ data: [
      { eventName: "page_view", consultantId: ok.id }, { eventName: "page_view", consultantId: ok.id },
      { eventName: "page_view", consultantId: ok.id, createdAt: new Date(Date.now() - 90 * 86_400_000) },
    ] });

    const got = await repo.findDiscoveryCandidates(100_000);
    const ids = new Set(got.map((c: { consultantProfileId: string }) => c.consultantProfileId));
    expect(ids.has(ok.id)).toBe(true);
    expect(ids.has(spaced.id)).toBe(true);
    for (const x of [claimed, noEmail, inactive, usa, noProv, hasLead, suppressed, unsub]) expect(ids.has(x.id)).toBe(false);
    const okRow = got.find((c: { consultantProfileId: string }) => c.consultantProfileId === ok.id);
    expect(okRow).toMatchObject({ timezone: "America/Vancouver", profileViews30d: 2 });
  });

  it("negativeStats: distinct people across negative replies, user_request unsubscribes (contacted only) and complaints", async () => {
    const since = new Date(Date.now() - 3_600_000);
    const base = await repo.negativeStats(since);

    const contacted = async () => {
      const p = await mkProfile(); const l = await mkLead(p.id);
      await prisma.outreachTouch.create({ data: { leadId: l.id, channel: "EMAIL", step: 1, body: "b", status: "SENT", sentAt: new Date(), idempotencyKey: `${l.id}:1:0` } });
      return { p, l };
    };
    const a = await contacted(); // negative reply AND unsubscribed → counts once
    await prisma.outreachReply.create({ data: { leadId: a.l.id, body: "no", label: "negative", confidence: 0.9 } });
    await prisma.emailUnsubscribe.create({ data: { email: a.p.rawEmail, reason: "user_request" } });
    const b = await contacted(); // complained
    await prisma.outreachSuppression.create({ data: { consultantProfileId: b.p.id, reason: "complained" } });
    const c = await contacted(); // bounced unsubscribe reason → must NOT count
    await prisma.emailUnsubscribe.create({ data: { email: c.p.rawEmail, reason: "bounced" } });
    const d = await mkProfile(); // unsubscribed but never contacted → must NOT count
    await prisma.emailUnsubscribe.create({ data: { email: d.rawEmail, reason: "user_request" } });

    const after = await repo.negativeStats(since);
    expect(after.touches - base.touches).toBe(3);
    expect(after.negatives - base.negatives).toBe(2);
  });

  it("lookups: listLeads excludes terminal states, findLeadByContact is case-insensitive, compose context, scheduled-email listing, cascade", async () => {
    const p = await mkProfile({ fullName: "Priya Nair Sharma", rawEmail: `Mixed.Case-${TAG}${MAIL}` });
    const lead = await mkLead(p.id, { state: "TOUCH_1", externalHandle: "@Handle_X" });
    expect((await repo.listLeads("EMAIL")).some((l: { id: string }) => l.id === lead.id)).toBe(true);
    expect((await repo.findLeadByContact({ email: p.rawEmail.toUpperCase(), channel: "EMAIL" }))?.id).toBe(lead.id);
    expect((await repo.findLeadByContact({ handle: "@handle_x", channel: "EMAIL" }))?.id).toBe(lead.id);
    expect(await repo.getComposeContext(lead.id)).toMatchObject({ firstName: "Priya", consultantProfileId: p.id });
    expect(await repo.getProfileEligibility(p.id)).toMatchObject({ exists: true, claimed: false, ciccActive: true, suppressed: false });

    const t = await repo.createTouch(touchInput(lead.id));
    await repo.updateTouch(t.id, { status: "SCHEDULED", externalMessageId: "re_abc", scheduledFor: new Date(Date.now() + 3_600_000) });
    expect((await repo.listFutureScheduledEmailTouches(new Date())).some((x: { id: string }) => x.id === t.id)).toBe(true);
    expect((await repo.findTouchByExternalId("re_abc"))?.id).toBe(t.id);

    await repo.saveLead(lead.id, snap({ state: "OPTED_OUT" }));
    expect((await repo.listLeads("EMAIL")).some((l: { id: string }) => l.id === lead.id)).toBe(false);

    await prisma.consultantProfile.delete({ where: { id: p.id } }); // cascade
    expect(await prisma.outreachTouch.count({ where: { leadId: lead.id } })).toBe(0);
    profileIds.splice(profileIds.indexOf(p.id), 1);
  });
});
