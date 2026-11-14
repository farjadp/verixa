/**
 * Outreach metrics from raw rows. Pure: the Prisma loader is in stats-repo.ts, so everything here is testable with fixtures.
 * Definitions: docs/superpowers/outreach-learning.md. Day and ISO week are in the operator timezone (America/Toronto).
 *
 * - A touch counts as sent when it is SENT, or SCHEDULED at Resend with its send time in the past.
 *   DRY_RUN, FAILED, CANCELLED, QUEUED and UNCERTAIN never count as volume (UNCERTAIN is shown separately).
 * - Delivery, bounce and complaint are per touch and attributed to the touch's send day.
 * - Replies, unsubscribes, clicks and claims are per person and attributed to the day they happened.
 * - Rates with a denominator under MIN_N are shown as counts only.
 */
import { localParts } from "./calendar";
import { OUTREACH } from "./config";

export const MIN_N = 30;
export const REPLY_LABELS = ["positive", "question", "negative", "auto_reply"] as const;
export type ReplyLabelName = (typeof REPLY_LABELS)[number];

export interface StatsLead { id: string; createdAt: Date; state: string; claimedAt: Date | null }
export interface StatsTouch {
  id: string; leadId: string; step: number; status: string; variant: string | null;
  scheduledFor: Date | null; sentAt: Date | null;
  deliveredAt: Date | null; bouncedAt: Date | null; bounceType: string | null; bounceReason: string | null; complainedAt: Date | null;
  /** Recipient address, for the bounce-domain rule. */
  email: string | null;
}
export interface StatsReply { leadId: string; label: string; receivedAt: Date }
export interface StatsPersonEvent { leadId: string; at: Date }
export interface StatsClick extends StatsPersonEvent { page: "profile" | "claim" }
export interface StatsRun { status: string; scheduled: number; dryRun: number; failed: number; followUpsHeld: number; detail: string | null; startedAt: Date }
export interface StatsInput {
  leads: StatsLead[];
  touches: StatsTouch[];
  replies: StatsReply[];
  unsubscribes: StatsPersonEvent[];
  clicks: StatsClick[];
  runs: StatsRun[];
}

export interface Rate { k: number; n: number; /** null when n < MIN_N */ value: number | null; low: number; high: number }

/** Wilson 95% interval; value is hidden below MIN_N so tiny samples are read as counts. */
export function rate(k: number, n: number): Rate {
  if (n === 0) return { k, n, value: null, low: 0, high: 1 };
  const z = 1.96;
  const p = k / n;
  const d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d;
  const h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return { k, n, value: n >= MIN_N ? p : null, low: Math.max(0, c - h), high: Math.min(1, c + h) };
}

const TZ = OUTREACH.operatorTimezone;
export const dayKey = (d: Date) => localParts(d, TZ).ymd;

/** ISO week of an operator-local date, e.g. "2026-W47". */
export function weekKey(d: Date): string {
  const [y, m, day] = dayKey(d).split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, day));
  const dow = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dow);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** When the email left (or was due to leave) Resend; null if it never counted as sent. */
export function sentTime(t: StatsTouch, now: Date): Date | null {
  if (t.status === "SENT") return t.sentAt ?? t.scheduledFor ?? t.deliveredAt ?? t.bouncedAt;
  if (t.status === "SCHEDULED" && t.scheduledFor && t.scheduledFor.getTime() <= now.getTime()) return t.scheduledFor;
  return null;
}

export const isHumanReply = (label: string) => label === "positive" || label === "question";

export interface Bucket {
  key: string;
  sent: number;
  people: number;
  delivered: number;
  hardBounces: number;
  softBounces: number;
  unclassifiedBounces: number;
  complaints: number;
  /** Distinct people per label on that day. */
  replies: Record<ReplyLabelName, number>;
  humanReplies: number;
  unsubscribes: number;
  optOuts: number;
  clicks: number;
  claims: number;
}

const emptyBucket = (key: string): Bucket => ({
  key, sent: 0, people: 0, delivered: 0, hardBounces: 0, softBounces: 0, unclassifiedBounces: 0, complaints: 0,
  replies: { positive: 0, question: 0, negative: 0, auto_reply: 0 }, humanReplies: 0, unsubscribes: 0, optOuts: 0, clicks: 0, claims: 0,
});

export interface SentTouch extends StatsTouch { at: Date }

export function sentTouches(input: StatsInput, now: Date): SentTouch[] {
  const out: SentTouch[] = [];
  for (const t of input.touches) {
    const at = sentTime(t, now);
    if (at) out.push({ ...t, at });
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** First sent-touch time per lead: only people actually contacted count in per-person metrics. */
function firstContact(sent: SentTouch[]): Map<string, Date> {
  const m = new Map<string, Date>();
  for (const t of sent) if (!m.has(t.leadId)) m.set(t.leadId, t.at);
  return m;
}

export function bucketize(input: StatsInput, now: Date, keyOf: (d: Date) => string): Map<string, Bucket> {
  const sent = sentTouches(input, now);
  const contacted = firstContact(sent);
  const buckets = new Map<string, Bucket>();
  const get = (d: Date) => {
    const k = keyOf(d);
    let b = buckets.get(k);
    if (!b) buckets.set(k, (b = emptyBucket(k)));
    return b;
  };
  const people = new Map<string, Set<string>>();
  const once = (bucketKey: string, kind: string, leadId: string) => {
    const k = `${bucketKey}|${kind}`;
    let s = people.get(k);
    if (!s) people.set(k, (s = new Set()));
    if (s.has(leadId)) return false;
    s.add(leadId);
    return true;
  };
  const afterContact = (leadId: string, at: Date) => {
    const first = contacted.get(leadId);
    return first !== undefined && first.getTime() <= at.getTime();
  };

  for (const t of sent) {
    const b = get(t.at);
    b.sent++;
    if (once(b.key, "people", t.leadId)) b.people++;
    if (t.deliveredAt) b.delivered++;
    if (t.bouncedAt) {
      if (t.bounceType === "hard") b.hardBounces++;
      else if (t.bounceType === "soft") b.softBounces++;
      else b.unclassifiedBounces++;
    }
    if (t.complainedAt) b.complaints++;
  }
  for (const r of input.replies) {
    if (!afterContact(r.leadId, r.receivedAt)) continue;
    const b = get(r.receivedAt);
    if ((REPLY_LABELS as readonly string[]).includes(r.label) && once(b.key, `r:${r.label}`, r.leadId)) b.replies[r.label as ReplyLabelName]++;
    if (isHumanReply(r.label) && once(b.key, "human", r.leadId)) b.humanReplies++;
    if (r.label === "negative" && once(b.key, "optout", r.leadId)) b.optOuts++;
  }
  for (const u of input.unsubscribes) {
    if (!afterContact(u.leadId, u.at)) continue;
    const b = get(u.at);
    if (once(b.key, "unsub", u.leadId)) b.unsubscribes++;
    if (once(b.key, "optout", u.leadId)) b.optOuts++;
  }
  for (const c of input.clicks) {
    if (!afterContact(c.leadId, c.at)) continue;
    const b = get(c.at);
    if (once(b.key, "click", c.leadId)) b.clicks++;
  }
  for (const l of input.leads) {
    if (!l.claimedAt || !afterContact(l.id, l.claimedAt)) continue;
    get(l.claimedAt).claims++;
  }
  return buckets;
}

/** The last `n` keys ending at `now`, oldest first, with empty buckets filled in. */
function lastKeys(now: Date, n: number, stepDays: number, keyOf: (d: Date) => string): string[] {
  const keys: string[] = [];
  for (let i = 0; keys.length < n && i < n * stepDays * 2; i += stepDays) {
    const k = keyOf(new Date(now.getTime() - i * 86_400_000));
    if (!keys.includes(k)) keys.push(k);
  }
  return keys.reverse();
}

export function series(input: StatsInput, now: Date, unit: "day" | "week", n: number): Bucket[] {
  const keyOf = unit === "day" ? dayKey : weekKey;
  const map = bucketize(input, now, keyOf);
  return lastKeys(now, n, unit === "day" ? 1 : 7, keyOf).map((k) => map.get(k) ?? emptyBucket(k));
}

export interface Funnel { leads: number; touch1: number; touch2: number; touch3: number; humanReply: number; anyReply: number; optOut: number; clicked: number; claimed: number }

export function funnel(input: StatsInput, now: Date): Funnel {
  const sent = sentTouches(input, now);
  const contacted = firstContact(sent);
  const byStep = (s: number) => new Set(sent.filter((t) => t.step === s).map((t) => t.leadId)).size;
  const after = (leadId: string, at: Date) => (contacted.get(leadId)?.getTime() ?? Infinity) <= at.getTime();
  const people = (rows: { leadId: string; at: Date }[]) => new Set(rows.filter((r) => after(r.leadId, r.at)).map((r) => r.leadId)).size;
  const replies = input.replies.map((r) => ({ leadId: r.leadId, at: r.receivedAt, label: r.label }));
  return {
    leads: input.leads.length,
    touch1: byStep(1),
    touch2: byStep(2),
    touch3: byStep(3),
    humanReply: people(replies.filter((r) => isHumanReply(r.label))),
    anyReply: people(replies),
    optOut: people([...replies.filter((r) => r.label === "negative"), ...input.unsubscribes]),
    clicked: people(input.clicks),
    claimed: input.leads.filter((l) => l.claimedAt && after(l.id, l.claimedAt)).length,
  };
}

export interface Cohort { week: string; size: number; ageDays: number; touch2: number; touch3: number; humanReply: number; optOut: number; clicked: number; claimed: number }

/** Cohort = ISO week of a person's first sent touch. Counts are cumulative to now; `ageDays` says how mature it is. */
export function cohorts(input: StatsInput, now: Date, n = 8): Cohort[] {
  const sent = sentTouches(input, now);
  const contacted = firstContact(sent);
  const groups = new Map<string, { first: Date; leads: Set<string> }>();
  for (const [leadId, first] of contacted) {
    const k = weekKey(first);
    const g = groups.get(k) ?? { first, leads: new Set<string>() };
    if (first < g.first) g.first = first;
    g.leads.add(leadId);
    groups.set(k, g);
  }
  const hasStep = (s: number) => new Set(sent.filter((t) => t.step === s).map((t) => t.leadId));
  const s2 = hasStep(2);
  const s3 = hasStep(3);
  const after = (leadId: string, at: Date) => (contacted.get(leadId)?.getTime() ?? Infinity) <= at.getTime();
  const human = new Set(input.replies.filter((r) => isHumanReply(r.label) && after(r.leadId, r.receivedAt)).map((r) => r.leadId));
  const opt = new Set([...input.replies.filter((r) => r.label === "negative").map((r) => ({ leadId: r.leadId, at: r.receivedAt })), ...input.unsubscribes].filter((e) => after(e.leadId, e.at)).map((e) => e.leadId));
  const clicked = new Set(input.clicks.filter((c) => after(c.leadId, c.at)).map((c) => c.leadId));
  const claimed = new Set(input.leads.filter((l) => l.claimedAt && after(l.id, l.claimedAt)).map((l) => l.id));
  const count = (leads: Set<string>, s: Set<string>) => [...leads].filter((id) => s.has(id)).length;
  return [...groups.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, n)
    .map(([week, g]) => ({
      week, size: g.leads.size, ageDays: Math.floor((now.getTime() - g.first.getTime()) / 86_400_000),
      touch2: count(g.leads, s2), touch3: count(g.leads, s3), humanReply: count(g.leads, human),
      optOut: count(g.leads, opt), clicked: count(g.leads, clicked), claimed: count(g.leads, claimed),
    }));
}

/**
 * A/B arm results for one experiment: touch-1 sends per arm, and people whose first human reply came
 * before their touch 2 was sent (the success metric in experiments.ts).
 */
export function armResults(input: StatsInput, now: Date, experimentId: string): { armId: string; sent: number; replies: number }[] {
  const sent = sentTouches(input, now);
  const t1 = sent.filter((t) => t.step === 1 && t.variant?.startsWith(`${experimentId}:`));
  const t2At = new Map(sent.filter((t) => t.step === 2).map((t) => [t.leadId, t.at]));
  const arms = new Map<string, { armId: string; sent: number; replies: number }>();
  for (const t of t1) {
    const armId = t.variant!.slice(experimentId.length + 1);
    const a = arms.get(armId) ?? { armId, sent: 0, replies: 0 };
    a.sent++;
    const cutoff = t2At.get(t.leadId)?.getTime() ?? Infinity;
    if (input.replies.some((r) => r.leadId === t.leadId && isHumanReply(r.label) && r.receivedAt >= t.at && r.receivedAt.getTime() < cutoff)) a.replies++;
    arms.set(armId, a);
  }
  return [...arms.values()];
}
