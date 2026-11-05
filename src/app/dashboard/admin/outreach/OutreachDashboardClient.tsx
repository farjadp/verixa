// src/app/dashboard/admin/outreach/OutreachDashboardClient.tsx
"use client";

import { useState, useTransition } from "react";
import { getOutreachSettingsAction, toggleOutreachFlag, type OutreachDashboard } from "@/actions/outreach.actions";
import type { OutreachFlag } from "@/lib/outreach/settings";

const TZ = "America/Toronto";
const dateTimeFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, dateStyle: "medium", timeStyle: "short" });
const timeFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, timeStyle: "short" });
const fmtDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));
const fmtTime = (iso: string) => timeFmt.format(new Date(iso));

const CHANNELS = ["LINKEDIN", "X", "EMAIL"] as const;
const STATES = ["BACKLOG", "INVITED", "TOUCH_1", "TOUCH_2", "TOUCH_3", "CONVERSATION", "CLAIMED", "OPTED_OUT", "CLOSED_NO_REPLY", "ARCHIVED"];

function Toggle({ label, on, danger, disabled, onChange }: { label: string; on: boolean; danger?: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-3 text-left text-sm transition-colors disabled:opacity-50 ${
        on ? (danger ? "border-amber-300 bg-amber-50 text-amber-900" : "border-emerald-300 bg-emerald-50 text-emerald-900") : "border-slate-200 bg-white text-slate-600"
      }`}
    >
      <span className="font-medium">{label}</span>
      <span className="font-mono text-xs uppercase">{on ? "on" : "off"}</span>
    </button>
  );
}

export default function OutreachDashboardClient({ initial }: { initial: OutreachDashboard }) {
  const [settings, setSettings] = useState(initial.settings);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const flip = (flag: OutreachFlag, value: boolean) =>
    start(async () => {
      setError(null);
      setWarning(null);
      try {
        const result = await toggleOutreachFlag(flag, value);
        setSettings(result.settings);
        if (result.cancelFailed > 0) {
          setWarning(`Sending is OFF, but ${result.cancelFailed} scheduled emails could not be cancelled at Resend and may still go out — cancel them in the Resend dashboard.`);
        }
      } catch (e) {
        setError((e as Error).message);
        try {
          setSettings(await getOutreachSettingsAction());
        } catch {
          // Leave the last known state; the red banner already tells the admin something failed.
        }
      }
    });

  const count = (c: string, s: string) => initial.counts.find((x) => x.channel === c && x.state === s)?.n ?? 0;
  const heartbeatAge = initial.heartbeat ? Math.round((new Date(initial.now).getTime() - new Date(initial.heartbeat).getTime()) / 3_600_000) : null;

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Consultant outreach</h1>
          <p className="text-sm text-slate-500">Mon–Thu · 8 found and 5 touches per channel per day · max 3 touches per person</p>
        </div>
        <p className={`text-sm ${heartbeatAge === null || heartbeatAge > 24 ? "text-amber-700" : "text-slate-500"}`}>
          Worker heartbeat: {heartbeatAge === null ? "never" : `${heartbeatAge}h ago`}
        </p>
      </header>

      {warning && <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">{warning}</p>}
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Toggle label="Outreach (kill switch)" on={settings.enabled} disabled={pending} onChange={(v) => flip("enabled", v)} />
        <Toggle label="Dry run" on={settings.dryRun} danger disabled={pending} onChange={(v) => flip("dryRun", v)} />
        {CHANNELS.map((c) => (
          <Toggle key={c} label={c} on={settings.channels[c]} disabled={pending} onChange={(v) => flip(c, v)} />
        ))}
      </section>

      <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">State</th>
              {CHANNELS.map((c) => <th key={c} className="px-3 py-2 text-right">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {STATES.map((s) => (
              <tr key={s} className="border-t border-slate-100">
                <td className="px-3 py-2 font-mono text-xs text-slate-700">{s}</td>
                {CHANNELS.map((c) => <td key={c} className="px-3 py-2 text-right tabular-nums text-slate-900">{count(c, s)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Conversations ({initial.conversations.length})</h2>
        {initial.conversations.length === 0 && <p className="text-sm text-slate-500">No replies waiting for you.</p>}
        {initial.conversations.map((c) => (
          <article key={c.leadId} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <a href={c.profileUrl} className="font-medium text-slate-900 underline-offset-2 hover:underline">{c.name}</a>
              <span className="text-xs text-slate-500">{c.channel} · {c.label} · {fmtDateTime(c.receivedAt)}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{c.body}</p>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Today ({initial.today.length})</h2>
        {initial.today.map((t) => (
          <details key={t.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <summary className="flex cursor-pointer flex-wrap justify-between gap-2 text-sm">
              <span className="font-medium text-slate-900">{t.name} · {t.channel} · touch {t.step}</span>
              <span className="font-mono text-xs text-slate-500">{t.status}{t.scheduledFor ? ` · ${fmtTime(t.scheduledFor)}` : ""}</span>
            </summary>
            {t.subject && <p className="mt-3 text-sm font-medium text-slate-800">{t.subject}</p>}
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{t.body}</p>
          </details>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Top backlog</h2>
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
          {initial.backlog.map((b) => (
            <li key={b.leadId} className="flex justify-between px-4 py-2">
              <span className="text-slate-900">{b.name}</span>
              <span className="font-mono text-xs text-slate-500">{b.channel} · {b.score}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
