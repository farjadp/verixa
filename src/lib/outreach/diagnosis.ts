/**
 * Automatic diagnosis for email outreach. Each rule turns raw stats into a plain-language finding and a fix.
 * Thresholds come from the email-marketing review (Nov 2026, docs/superpowers/outreach-learning.md) and are sized for
 * ~40 sends a week: they count events in recent sends instead of trusting percentages from tiny samples.
 *
 * `pause: true` findings are acted on by checkHealth (health.ts), which owns auto-pause. A pause fires only when the
 * triggering event is fresh (last 26h), so turning outreach back on after reading the alert is not undone the next morning
 * by the same old event.
 */
import { addCalendarDays, isActiveDay } from "./calendar";
import { OUTREACH } from "./config";
import { dayKey, isHumanReply, sentTouches, type SentTouch, type StatsInput } from "./metrics";

export type Severity = "info" | "warn" | "critical";
export interface Finding { id: string; severity: Severity; title: string; finding: string; fix: string; pause: boolean }

export const DIAGNOSIS = {
  /** Events newer than this can trigger a pause; older ones only report. */
  freshHours: 26,
  hardBounce: { window: 30, warnAt: 2, criticalAt: 3, longWindow: 100, longMinSent: 50, longMaxRate: 0.04 },
  softStreak: { warnAt: 3, criticalAt: 5 },
  complaintLookbackDays: 7,
  bounceDomain: { lookbackDays: 30, minBounces: 2, minShare: 0.5 },
  webhook: { minAgeHours: 2, minSent: 5, lookbackDays: 7, warnMinSent: 10, warnBelowShare: 0.5 },
  unsubscribe: { lookbackDays: 28, minPeople: 40, maxRate: 0.04 },
  replyCollapse: { windowDays: 28, minPeople: 80, dropBelowShare: 0.2 },
  compose: { minAttempts: 3, maxFailShare: 0.3, maxFailed: 3 },
} as const;

const H = 3_600_000;
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const domainOf = (email: string | null) => email?.split("@")[1]?.trim().toLowerCase() || null;

export interface DiagnoseArgs {
  now: Date;
  input: StatsInput;
  /** Whether outreach and the EMAIL channel are on (cron rules only matter then). */
  emailOn: boolean;
}

export function diagnose({ now, input, emailOn }: DiagnoseArgs): Finding[] {
  const out: Finding[] = [];
  const sent = sentTouches(input, now);
  const fresh = (d: Date | null | undefined) => !!d && now.getTime() - d.getTime() <= DIAGNOSIS.freshHours * H;

  // ── Complaints: one is already 8x Gmail's ceiling at our volume ──
  const since = addCalendarDays(now, -DIAGNOSIS.complaintLookbackDays);
  const complaints = sent.filter((t) => t.complainedAt && t.complainedAt >= since);
  if (complaints.length) {
    const newest = complaints.reduce((a, b) => (a.complainedAt! > b.complainedAt! ? a : b));
    out.push({
      id: "complaint", severity: "critical", pause: fresh(newest.complainedAt),
      title: `${complaints.length} spam complaint${complaints.length > 1 ? "s" : ""} in ${DIAGNOSIS.complaintLookbackDays} days`,
      finding: `A recipient marked an outreach email as spam. At ~40 sends a week one complaint is 2.5%, far above Gmail's 0.3% and Resend's 0.08% limits.`,
      fix: "Read the email that was reported (touch step and subject in the admin), tighten targeting or copy, then turn outreach back on yourself.",
    });
  }

  // ── Hard bounces in recent sends ──
  const hb = DIAGNOSIS.hardBounce;
  const recent = sent.slice(-hb.window);
  const hard = recent.filter((t) => t.bounceType === "hard");
  const long = sent.slice(-hb.longWindow);
  const longHard = long.filter((t) => t.bounceType === "hard").length;
  const longTrip = long.length >= hb.longMinSent && longHard / long.length > hb.longMaxRate;
  if (hard.length >= hb.criticalAt || longTrip) {
    out.push({
      id: "hard_bounce", severity: "critical", pause: hard.some((t) => fresh(t.bouncedAt)),
      title: `Hard bounces: ${hard.length} of the last ${recent.length} sends`,
      finding: `Addresses from the CICC registry are failing permanently${longTrip ? ` (${pct(longHard / long.length)} of the last ${long.length}, above Resend's 4% limit)` : ""}. More of this hurts the sending domain.`,
      fix: "Check the bounce reasons below. If they are 'mailbox does not exist', filter stale registry emails before they become leads.",
    });
  } else if (hard.length >= hb.warnAt) {
    out.push({
      id: "hard_bounce", severity: "warn", pause: false,
      title: `Hard bounces: ${hard.length} of the last ${recent.length} sends`,
      finding: "Two permanent bounces in a short window. Not yet a pattern, but one more pauses sending.",
      fix: "Look at the bounce reasons; if the same domain repeats, see the domain finding.",
    });
  }

  // ── Soft-bounce streak: the most recent outcomes are all temporary failures ──
  const outcomes = sent.filter((t) => t.deliveredAt || t.bouncedAt);
  let streak = 0;
  for (let i = outcomes.length - 1; i >= 0 && outcomes[i].bounceType === "soft" && !outcomes[i].deliveredAt; i--) streak++;
  if (streak >= DIAGNOSIS.softStreak.warnAt) {
    out.push({
      id: "soft_streak", severity: streak >= DIAGNOSIS.softStreak.criticalAt ? "critical" : "warn", pause: false,
      title: `${streak} soft bounces in a row`,
      finding: "The last emails all failed temporarily. That usually means a provider is throttling or blocking us, not bad addresses.",
      fix: "Check the bounce reasons for block codes (e.g. 421/450, 'rate limited', 'blocked'). Lower volume or pause if a provider is blocking.",
    });
  }

  // ── Bounces clustered on one domain/provider ──
  const bd = DIAGNOSIS.bounceDomain;
  const bounceSince = addCalendarDays(now, -bd.lookbackDays);
  const bounced = sent.filter((t) => t.bouncedAt && t.bouncedAt >= bounceSince);
  const byDomain = new Map<string, SentTouch[]>();
  for (const t of bounced) {
    const d = domainOf(t.email);
    if (d) byDomain.set(d, [...(byDomain.get(d) ?? []), t]);
  }
  for (const [domain, rows] of byDomain) {
    if (rows.length >= bd.minBounces && rows.length / bounced.length >= bd.minShare) {
      const reason = rows.find((r) => r.bounceReason)?.bounceReason;
      out.push({
        id: `bounce_domain:${domain}`, severity: "warn", pause: false,
        title: `Bounces concentrate on ${domain}`,
        finding: `${rows.length} of ${bounced.length} bounces in ${bd.lookbackDays} days went to ${domain}.${reason ? ` Last reason: "${reason.slice(0, 160)}".` : ""}`,
        fix: `If ${domain} is a big provider, it may be filtering us; check its postmaster tools. If it is one firm's domain, the addresses are probably stale.`,
      });
    }
  }

  // ── Webhook silent: sends with no delivery outcome ──
  const wh = DIAGNOSIS.webhook;
  const whSince = addCalendarDays(now, -wh.lookbackDays);
  const due = sent.filter((t) => t.at >= whSince && now.getTime() - t.at.getTime() >= wh.minAgeHours * H);
  const withOutcome = due.filter((t) => t.deliveredAt || t.bouncedAt || t.complainedAt).length;
  if (due.length >= wh.minSent && withOutcome === 0) {
    out.push({
      id: "webhook_silent", severity: "critical", pause: due.some((t) => fresh(t.at)),
      title: `No delivery events for ${due.length} sent emails`,
      finding: "Resend has sent these, but no delivered/bounced/complained event reached Verixa. Bounces and complaints are not being suppressed.",
      fix: "Resend → Webhooks: check the endpoint https://www.getverixa.com/api/webhooks/resend is enabled and RESEND_WEBHOOK_SECRET matches.",
    });
  } else if (due.length >= wh.warnMinSent && withOutcome / due.length < wh.warnBelowShare) {
    out.push({
      id: "webhook_partial", severity: "warn", pause: false,
      title: `Only ${withOutcome} of ${due.length} sends have a delivery event`,
      finding: "Some webhook events are missing, so delivery and bounce numbers undercount.",
      fix: "Check failed deliveries in Resend → Webhooks and replay them.",
    });
  }

  // ── Unsubscribes ──
  const u = DIAGNOSIS.unsubscribe;
  const uSince = addCalendarDays(now, -u.lookbackDays);
  const contacted = new Set(sent.filter((t) => t.at >= uSince).map((t) => t.leadId));
  const unsubs = new Set(input.unsubscribes.filter((e) => e.at >= uSince && contacted.has(e.leadId)).map((e) => e.leadId));
  if (contacted.size >= u.minPeople && unsubs.size / contacted.size > u.maxRate) {
    out.push({
      id: "unsubscribe", severity: "warn", pause: false,
      title: `Unsubscribes ${pct(unsubs.size / contacted.size)} (${unsubs.size} of ${contacted.size} people)`,
      finding: `More than ${pct(u.maxRate)} of people contacted in ${u.lookbackDays} days used the unsubscribe link.`,
      fix: "Compare which touch they unsubscribed after; if it is the follow-ups, shorten the sequence or soften touch 2/3.",
    });
  }

  // ── Reply-rate collapse: only detectable over 4-week windows, and only large drops ──
  const rc = DIAGNOSIS.replyCollapse;
  const cur = windowReplyRate(input, now, addCalendarDays(now, -rc.windowDays), now);
  const prev = windowReplyRate(input, now, addCalendarDays(now, -2 * rc.windowDays), addCalendarDays(now, -rc.windowDays));
  if (cur.people >= rc.minPeople && prev.people >= rc.minPeople && prev.rate > 0 && cur.rate < prev.rate * rc.dropBelowShare) {
    out.push({
      id: "reply_collapse", severity: "info", pause: false,
      title: `Human reply rate fell from ${pct(prev.rate)} to ${pct(cur.rate)}`,
      finding: `Over the last ${rc.windowDays} days replies dropped by more than ${Math.round((1 - rc.dropBelowShare) * 100)}% versus the ${rc.windowDays} days before.`,
      fix: "Check deliverability first (bounces, Gmail Postmaster spam rate). If delivery is fine, the audience or copy changed.",
    });
  }

  // ── Cron runs ──
  const runs = [...input.runs].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
  const last = runs.at(-1);
  if (emailOn && runs.length) {
    const prevDay = previousActiveDay(now);
    const ranThatDay = runs.some((r) => dayKey(r.startedAt) === prevDay);
    const recordedBefore = runs.some((r) => dayKey(r.startedAt) < prevDay);
    if (!ranThatDay && recordedBefore) {
      out.push({
        id: "cron_missed", severity: "critical", pause: false,
        title: `The email cron did not run on ${prevDay}`,
        finding: "No outreach-email run was recorded on the last active day, so nothing was planned or sent.",
        fix: "Vercel → Project → Cron Jobs: check /api/cron/outreach-email ran and CRON_SECRET is set; check the function logs for a timeout.",
      });
    }
  }
  if (last?.status === "error") {
    out.push({
      id: "cron_error", severity: "critical", pause: false,
      title: "The last email cron run failed",
      finding: `The run on ${dayKey(last.startedAt)} stopped with an error: ${(last.detail ?? "no detail").slice(0, 200)}`,
      fix: "Fix the error above (often a missing env var), then wait for the next cron or run it by hand.",
    });
  }
  if (last && last.followUpsHeld > 0) {
    out.push({
      id: "followups_held", severity: "warn", pause: false,
      title: `${last.followUpsHeld} follow-up${last.followUpsHeld > 1 ? "s" : ""} held: inbox not read`,
      finding: "Follow-ups wait until the Mac worker has read the reply inbox, so an opt-out is never answered with another email.",
      fix: "Check the Mac worker is running and its IMAP login works (worker logs, heartbeat on this page).",
    });
  }
  const c = DIAGNOSIS.compose;
  if (last && last.status !== "error") {
    const attempts = last.scheduled + last.dryRun + last.failed;
    if (attempts >= c.minAttempts && (last.failed >= c.maxFailed || last.failed / attempts >= c.maxFailShare)) {
      out.push({
        id: "compose_failures", severity: "warn", pause: false,
        title: `${last.failed} of ${attempts} emails failed in the last run`,
        finding: "Composing or handing emails to Resend failed for a large share of today's leads.",
        fix: "Check the Vercel logs for '[outreach] compose failed' or Resend errors; follow-ups need OPENAI_API_KEY.",
      });
    }
  }

  const order: Record<Severity, number> = { critical: 0, warn: 1, info: 2 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}

/** Human reply rate of the people first contacted in [from, to). Replies are counted to now (cumulative). */
function windowReplyRate(input: StatsInput, now: Date, from: Date, to: Date): { people: number; rate: number } {
  const firsts = new Map<string, Date>();
  for (const t of sentTouches(input, now)) if (!firsts.has(t.leadId)) firsts.set(t.leadId, t.at);
  const people = [...firsts].filter(([, at]) => at >= from && at < to).map(([id]) => id);
  if (!people.length) return { people: 0, rate: 0 };
  const replied = new Set(input.replies.filter((r) => isHumanReply(r.label)).map((r) => r.leadId));
  return { people: people.length, rate: people.filter((id) => replied.has(id)).length / people.length };
}

/** The most recent active day strictly before today (operator timezone). */
export function previousActiveDay(now: Date): string {
  const today = dayKey(now);
  for (let i = 1; i <= 7; i++) {
    const d = addCalendarDays(now, -i);
    if (isActiveDay(d, OUTREACH.operatorTimezone) && dayKey(d) !== today) return dayKey(d);
  }
  return today;
}
