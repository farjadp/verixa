// src/app/dashboard/admin/outreach/OutreachStatsSection.tsx — email results, diagnosis and experiments on the outreach admin page.
import type { Bucket } from "@/lib/outreach/metrics";
import { MIN_N, rate } from "@/lib/outreach/metrics";
import type { OutreachStats } from "@/lib/outreach/stats-view";
import { fmtRate } from "@/lib/outreach/weekly-report";

/** Short form for tight spots: "70.9%" when the sample is big enough, else "8/24". */
const short = (k: number, n: number) => {
  const r = rate(k, n);
  return r.value === null ? `${k}/${n}` : `${(r.value * 100).toFixed(1)}%`;
};

const TZ = "America/Toronto";
const dateFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, month: "short", day: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const fmtDay = (ymd: string) => dateFmt.format(new Date(`${ymd}T12:00:00Z`));

const SEVERITY = {
  critical: { bar: "border-l-red-500", tag: "bg-red-50 text-red-800", label: "Critical" },
  warn: { bar: "border-l-amber-400", tag: "bg-amber-50 text-amber-900", label: "Warning" },
  info: { bar: "border-l-slate-300", tag: "bg-slate-100 text-slate-700", label: "Info" },
} as const;

const EXPERIMENT_TAG: Record<string, string> = {
  waiting_approval: "bg-slate-100 text-slate-700",
  collecting: "bg-sky-50 text-sky-800",
  winner: "bg-emerald-50 text-emerald-800",
  keep_control: "bg-slate-100 text-slate-700",
  concluded: "bg-slate-100 text-slate-500",
};

function sum(buckets: Bucket[]) {
  return buckets.reduce(
    (a, b) => ({
      sent: a.sent + b.sent, delivered: a.delivered + b.delivered, hard: a.hard + b.hardBounces, soft: a.soft + b.softBounces,
      complaints: a.complaints + b.complaints, human: a.human + b.humanReplies, optOuts: a.optOuts + b.optOuts, clicks: a.clicks + b.clicks, claims: a.claims + b.claims,
    }),
    { sent: 0, delivered: 0, hard: 0, soft: 0, complaints: 0, human: 0, optOuts: 0, clicks: 0, claims: 0 },
  );
}

function Kpi({ label, value, sub, alert }: { label: string; value: string | number; sub?: string; alert?: boolean }) {
  return (
    <div className="px-4 py-3">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`mt-1 text-xl font-semibold tabular-nums ${alert ? "text-red-700" : "text-slate-900"}`}>{value}</dd>
      {sub && <dd className="text-xs tabular-nums text-slate-500">{sub}</dd>}
    </div>
  );
}

const Th = ({ children, left }: { children: React.ReactNode; left?: boolean }) => <th className={`px-3 py-2 font-medium ${left ? "text-left" : "text-right"}`}>{children}</th>;
const Td = ({ children, left, muted }: { children: React.ReactNode; left?: boolean; muted?: boolean }) => (
  <td className={`px-3 py-2 tabular-nums ${left ? "text-left" : "text-right"} ${muted ? "text-slate-400" : "text-slate-900"}`}>{children}</td>
);

function BucketTable({ rows, keyLabel, format }: { rows: Bucket[]; keyLabel: string; format: (k: string) => string }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr><Th left>{keyLabel}</Th><Th>Sent</Th><Th>Delivered</Th><Th>Hard / soft bounce</Th><Th>Complaints</Th><Th>Human replies</Th><Th>Opt-outs</Th><Th>Link visits</Th><Th>Claims</Th></tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.key} className="border-t border-slate-100">
              <Td left>{format(b.key)}</Td>
              <Td muted={!b.sent}>{b.sent}</Td>
              <Td muted={!b.sent}>{b.sent ? fmtRate(rate(b.delivered, b.sent)) : "–"}</Td>
              <Td muted={!b.hardBounces && !b.softBounces}>{b.hardBounces} / {b.softBounces}</Td>
              <Td muted={!b.complaints}>{b.complaints}</Td>
              <Td muted={!b.humanReplies}>{b.humanReplies}</Td>
              <Td muted={!b.optOuts}>{b.optOuts}</Td>
              <Td muted={!b.clicks}>{b.clicks}</Td>
              <Td muted={!b.claims}>{b.claims}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FunnelChart({ stages }: { stages: { label: string; n: number; of?: number }[] }) {
  const max = Math.max(1, ...stages.map((s) => s.n));
  return (
    <ol className="space-y-2">
      {stages.map((s) => (
        <li key={s.label} className="grid grid-cols-[7rem_1fr_6.5rem] items-center gap-3 text-sm">
          <span className="text-slate-600">{s.label}</span>
          <svg viewBox="0 0 100 8" preserveAspectRatio="none" className="h-3 w-full" aria-hidden>
            <rect x="0" y="0" width="100" height="8" rx="2" className="fill-slate-100" />
            <rect x="0" y="0" width={(s.n / max) * 100} height="8" rx="2" className="fill-slate-700" />
          </svg>
          <span className="text-right tabular-nums text-slate-900">
            {s.n}
            {s.of !== undefined && s.of > 0 && <span className="ml-1 text-xs text-slate-500">{short(s.n, s.of)}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function OutreachStatsSection({ stats }: { stats: OutreachStats }) {
  const last7 = sum(stats.days.slice(-7));
  const f = stats.funnel;
  // Weeks before the first send are just empty rows.
  const firstWeek = stats.weeks.findIndex((w) => w.sent > 0);
  const weeks = firstWeek < 0 ? [] : stats.weeks.slice(firstWeek);
  const activeDays = stats.days.filter((d) => d.sent || d.humanReplies || d.optOuts || d.clicks || d.claims || d.complaints);

  return (
    <section className="min-w-0 space-y-6" aria-labelledby="email-results">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="email-results" className="text-lg font-semibold text-slate-900">Email results</h2>
        <p className="text-xs text-slate-500">Toronto time · dry runs excluded · a rate shows once its sample reaches {MIN_N}; below that you see counts</p>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-slate-700">Diagnosis</h3>
        {stats.findings.length === 0 ? (
          <p className="rounded-lg border border-slate-200 border-l-4 border-l-emerald-500 bg-white px-4 py-3 text-sm text-slate-700">Nothing wrong found in sends, bounces, replies or cron runs.</p>
        ) : (
          <ul className="space-y-2">
            {stats.findings.map((x) => (
              <li key={x.id} className={`rounded-lg border border-slate-200 border-l-4 ${SEVERITY[x.severity].bar} bg-white px-4 py-3 text-sm`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${SEVERITY[x.severity].tag}`}>{SEVERITY[x.severity].label}</span>
                  <span className="font-medium text-slate-900">{x.title}</span>
                  {x.pause && <span className="text-xs font-medium text-red-700">auto-pauses sending</span>}
                </div>
                <p className="mt-1 text-slate-700">{x.finding}</p>
                <p className="mt-1 text-slate-600"><span className="font-medium text-slate-800">Fix: </span>{x.fix}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <dl className="grid grid-cols-2 divide-x divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white sm:grid-cols-4 lg:grid-cols-7 lg:divide-y-0">
        <Kpi label="Sent · 7 days" value={last7.sent} sub={stats.uncertain ? `${stats.uncertain} uncertain` : undefined} />
        <Kpi label="Delivered" value={last7.sent ? short(last7.delivered, last7.sent) : "–"} sub={last7.sent ? `${last7.delivered}/${last7.sent}` : undefined} />
        <Kpi label="Hard bounces" value={last7.hard} sub={`${last7.soft} soft`} alert={last7.hard >= 2} />
        <Kpi label="Complaints" value={last7.complaints} alert={last7.complaints > 0} />
        <Kpi label="Human replies" value={last7.human} sub={`${last7.optOuts} opt-outs`} />
        <Kpi label="Link visits" value={last7.clicks} sub="people" />
        <Kpi label="Claims" value={last7.claims} />
      </dl>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="min-w-0 space-y-3">
          <h3 className="text-sm font-medium text-slate-700">Funnel since start</h3>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <FunnelChart stages={[
              { label: "Leads", n: f.leads },
              { label: "Touch 1", n: f.touch1, of: f.leads },
              { label: "Touch 2", n: f.touch2, of: f.touch1 },
              { label: "Touch 3", n: f.touch3, of: f.touch2 },
              { label: "Human reply", n: f.humanReply, of: f.touch1 },
              { label: "Link visit", n: f.clicked, of: f.touch1 },
              { label: "Claimed", n: f.claimed, of: f.touch1 },
            ]} />
            <p className="mt-3 text-xs text-slate-500">Replies, opt-outs and claims stop the sequence, so later touches are smaller by design. {f.optOut} people opted out.</p>
          </div>
        </div>

        <div className="min-w-0 space-y-3">
          <h3 className="text-sm font-medium text-slate-700">Experiments</h3>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            {stats.experiments.map((e) => (
              <li key={e.id} className="space-y-2 p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-slate-900">{e.title}</span>
                  <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${EXPERIMENT_TAG[e.status]}`}>{e.status.replace("_", " ")}</span>
                </div>
                <p className="text-slate-700">{e.message}</p>
                <p className="font-mono text-xs text-slate-500">{e.arms.map((a) => `${a.armId}: ${a.replies}/${a.sent} replied`).join(" · ")}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-700">By week</h3>
        {weeks.length ? <BucketTable rows={[...weeks].reverse()} keyLabel="ISO week" format={(k) => k} /> : <p className="text-sm text-slate-500">No real sends yet. Dry-run days show under Cron runs.</p>}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-700">Last 14 days</h3>
        {activeDays.length ? <BucketTable rows={[...activeDays].reverse()} keyLabel="Day" format={fmtDay} /> : <p className="text-sm text-slate-500">No real sends or responses in the last 14 days.</p>}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-700">Cohorts (week of first email, cumulative)</h3>
        {stats.cohorts.length === 0 ? <p className="text-sm text-slate-500">No cohorts yet: the first real send starts one.</p> : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr><Th left>Cohort</Th><Th>People</Th><Th>Age</Th><Th>Touch 2</Th><Th>Touch 3</Th><Th>Human reply</Th><Th>Opt-out</Th><Th>Link visit</Th><Th>Claimed</Th></tr>
              </thead>
              <tbody>
                {stats.cohorts.map((c) => (
                  <tr key={c.week} className="border-t border-slate-100">
                    <Td left>{c.week}</Td><Td>{c.size}</Td><Td muted={c.ageDays < 14}>{c.ageDays}d{c.ageDays < 14 ? " · immature" : ""}</Td>
                    <Td>{c.touch2}</Td><Td>{c.touch3}</Td><Td>{fmtRate(rate(c.humanReply, c.size))}</Td><Td>{c.optOut}</Td><Td>{c.clicked}</Td><Td>{c.claimed}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="min-w-0 space-y-3">
          <h3 className="text-sm font-medium text-slate-700">Cron runs</h3>
          {stats.runs.length === 0 ? <p className="text-sm text-slate-500">No runs recorded yet.</p> : (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
              {stats.runs.map((r) => (
                <li key={r.startedAt} className="flex flex-wrap justify-between gap-2 px-4 py-2">
                  <span className="text-slate-900">{dateTimeFmt.format(new Date(r.startedAt))}</span>
                  <span className={`font-mono text-xs ${r.status === "error" ? "text-red-700" : "text-slate-500"}`}>
                    {r.status} · {r.scheduled} sent · {r.dryRun} dry · {r.failed} failed{r.followUpsHeld ? ` · ${r.followUpsHeld} held` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="min-w-0 space-y-3">
          <h3 className="text-sm font-medium text-slate-700">Recent bounces</h3>
          {stats.bounces.length === 0 ? <p className="text-sm text-slate-500">No bounces.</p> : (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
              {stats.bounces.map((b) => (
                <li key={b.at} className="px-4 py-2">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-900">{b.domain ?? "unknown domain"} · touch {b.step}</span>
                    <span className="font-mono text-xs text-slate-500">{b.type ?? "unclassified"} · {dateTimeFmt.format(new Date(b.at))}</span>
                  </div>
                  {b.reason && <p className="mt-1 truncate text-xs text-slate-500">{b.reason}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
