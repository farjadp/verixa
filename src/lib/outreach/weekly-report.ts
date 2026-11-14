/**
 * Weekly outreach summary, sent with the Monday health run to OUTREACH_ALERT_EMAIL.
 * Plain lines, so it goes through the same founder-alert email as the daily health warning.
 */
import { addCalendarDays, localParts } from "./calendar";
import { OUTREACH } from "./config";
import type { Finding } from "./diagnosis";
import { EXPERIMENTS, evaluateExperiment, type ExperimentReadout } from "./experiments";
import { MIN_N, armResults, bucketize, funnel, rate, weekKey, type Bucket, type Rate, type StatsInput } from "./metrics";

export const isReportDay = (now: Date) => localParts(now, OUTREACH.operatorTimezone).weekday === 1; // Monday

export function fmtRate(r: Rate): string {
  if (r.n === 0) return "–";
  if (r.value === null) return `${r.k}/${r.n}`;
  return `${(r.value * 100).toFixed(1)}% (${r.k}/${r.n})`;
}

const delta = (cur: number, prev: number) => (cur === prev ? "same" : cur > prev ? `+${cur - prev}` : `${cur - prev}`);

export function experimentReadouts(input: StatsInput, now: Date): ExperimentReadout[] {
  return EXPERIMENTS.map((e) => evaluateExperiment(e, armResults(input, now, e.id)));
}

export interface WeeklyReport { week: string; subject: string; lines: string[] }

export function buildWeeklyReport({ now, input, findings }: { now: Date; input: StatsInput; findings: Finding[] }): WeeklyReport {
  const week = weekKey(addCalendarDays(now, -7));
  const prevWeek = weekKey(addCalendarDays(now, -14));
  const map = bucketize(input, now, weekKey);
  const empty = (key: string): Bucket => ({ key, sent: 0, people: 0, delivered: 0, hardBounces: 0, softBounces: 0, unclassifiedBounces: 0, complaints: 0, replies: { positive: 0, question: 0, negative: 0, auto_reply: 0 }, humanReplies: 0, unsubscribes: 0, optOuts: 0, clicks: 0, claims: 0 });
  const cur = map.get(week) ?? empty(week);
  const prev = map.get(prevWeek) ?? empty(prevWeek);
  const f = funnel(input, now);

  const row = (label: string, c: number, p: number) => `${label}: ${c} (last week ${p}, ${delta(c, p)})`;
  const lines: string[] = [
    `Week ${week} (Mon–Sun, Toronto time). Numbers under ${MIN_N} are shown as counts: at ~40 sends a week, week-to-week swings are mostly noise.`,
    "",
    "THIS WEEK vs LAST WEEK",
    row("Emails sent", cur.sent, prev.sent),
    `Delivered: ${fmtRate(rate(cur.delivered, cur.sent))}`,
    row("Hard bounces", cur.hardBounces, prev.hardBounces),
    row("Soft bounces", cur.softBounces, prev.softBounces),
    row("Spam complaints", cur.complaints, prev.complaints),
    row("Human replies (positive + question)", cur.humanReplies, prev.humanReplies),
    `Replies by label: positive ${cur.replies.positive}, question ${cur.replies.question}, negative ${cur.replies.negative}, auto-reply ${cur.replies.auto_reply}`,
    row("Opt-outs (negative reply or unsubscribe)", cur.optOuts, prev.optOuts),
    row("People who opened their profile/claim link", cur.clicks, prev.clicks),
    row("Claims", cur.claims, prev.claims),
    "",
    "FUNNEL SINCE START",
    `Leads ${f.leads} → touch 1 ${f.touch1} → touch 2 ${f.touch2} → touch 3 ${f.touch3}`,
    `Human reply ${fmtRate(rate(f.humanReply, f.touch1))} · link visit ${fmtRate(rate(f.clicked, f.touch1))} · claimed ${fmtRate(rate(f.claimed, f.touch1))} · opted out ${fmtRate(rate(f.optOut, f.touch1))}`,
    "",
    "DIAGNOSIS",
    ...(findings.length ? findings.map((x) => `[${x.severity.toUpperCase()}] ${x.title}. ${x.finding} Fix: ${x.fix}`) : ["Nothing wrong found."]),
    "",
    "EXPERIMENTS",
    ...experimentReadouts(input, now).map((r) => `${r.title}: ${r.message} (${r.arms.map((a) => `${a.armId} ${a.replies}/${a.sent}`).join(", ")})`),
  ];
  const flag = findings.some((x) => x.severity === "critical") ? " — action needed" : "";
  return { week, subject: `Weekly summary ${week}: ${cur.sent} sent, ${cur.humanReplies} replies, ${cur.claims} claims${flag}`, lines };
}
