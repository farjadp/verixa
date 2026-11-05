"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertTriangle, CheckCircle2, ChevronDown, ExternalLink, Loader2, Play, RotateCcw, Rss, Save, ShieldCheck, Workflow, XCircle,
} from "lucide-react";
import {
  approvePipelineJob, overrideRejectedJob, rejectPipelineJob, retryPipelineJob, runContentPipelineNow, setContentSourceEnabled,
  updateContentPipelineConfig, type ContentPipelineDashboard,
} from "@/actions/content-pipeline.actions";

type Job = ContentPipelineDashboard["jobs"][number];
type Settings = ContentPipelineDashboard["settings"];

const STAGES = ["SELECTED", "WRITING", "SEO", "REVIEW", "IMAGE", "READY", "PUBLISHED"] as const;
const STAGE_LABEL: Record<string, string> = {
  SELECTED: "Selected", WRITING: "Writer", SEO: "SEO", REVIEW: "Review", IMAGE: "Image", READY: "Awaiting approval",
  PUBLISHED: "Published", REJECTED: "Rejected", FAILED: "Failed", SKIPPED_DUPLICATE: "Duplicate",
};
const TERMINAL_STAGES = ["REJECTED", "FAILED", "SKIPPED_DUPLICATE"];
const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "fa", label: "Persian (Farsi)" },
  { value: "fr", label: "French" },
  { value: "en+fa", label: "English + Persian summary" },
  { value: "en+fr", label: "English + French summary" },
];
const CHANNEL_LABEL = { linkedin: "LinkedIn", twitter: "X / Twitter", facebook: "Facebook", telegram: "Telegram" } as const;

const FILTERS = [
  { key: "review", label: "Needs approval", match: (j: Job) => j.stage === "READY" },
  { key: "rejected", label: "Rejected", match: (j: Job) => j.stage === "REJECTED" },
  { key: "published", label: "Published", match: (j: Job) => j.stage === "PUBLISHED" },
  { key: "failed", label: "Failed / skipped", match: (j: Job) => j.stage === "FAILED" || j.stage === "SKIPPED_DUPLICATE" },
  { key: "all", label: "All", match: () => true },
] as const;

function stageTone(stage: string): string {
  if (stage === "PUBLISHED") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (stage === "READY") return "bg-amber-50 text-amber-800 border-amber-200";
  if (stage === "REJECTED") return "bg-orange-50 text-orange-800 border-orange-200";
  if (stage === "FAILED") return "bg-red-50 text-red-700 border-red-200";
  if (stage === "SKIPPED_DUPLICATE") return "bg-gray-100 text-gray-600 border-gray-200";
  return "bg-sky-50 text-sky-700 border-sky-200";
}

function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2FA4A9] focus-visible:ring-offset-2 disabled:opacity-50 ${checked ? "bg-[#2FA4A9]" : "bg-gray-300"}`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

function StageTrack({ stage }: { stage: string }) {
  const idx = STAGES.indexOf(stage as (typeof STAGES)[number]);
  return (
    <ol className="flex items-center gap-1" aria-label={`Stage: ${STAGE_LABEL[stage] ?? stage}`}>
      {STAGES.map((s, i) => (
        <li key={s} title={STAGE_LABEL[s]} className={`h-1.5 w-6 rounded-full ${idx >= i ? "bg-[#2FA4A9]" : "bg-gray-200"}`} />
      ))}
    </ol>
  );
}

export default function ContentPipelineClient({ data }: { data: ContentPipelineDashboard }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [settings, setSettings] = useState<Settings>(data.settings);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("review");
  const [openJob, setOpenJob] = useState<string | null>(null);
  const [openRun, setOpenRun] = useState<string | null>(null);

  const dirty = JSON.stringify(settings) !== JSON.stringify(data.settings);
  const jobs = useMemo(() => data.jobs.filter(FILTERS.find((f) => f.key === filter)!.match), [data.jobs, filter]);
  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.key, data.jobs.filter(f.match).length])) as Record<string, number>,
    [data.jobs]
  );

  function act(key: string, fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    setBusy(key);
    setNotice(null);
    startTransition(async () => {
      try {
        const r = await fn();
        setNotice(r.ok ? { tone: "ok", text: r.message || "Done." } : { tone: "error", text: r.error || "Something went wrong." });
        if (r.ok) router.refresh();
      } catch {
        setNotice({ tone: "error", text: "Request failed. Check the server logs." });
      } finally {
        setBusy(null);
      }
    });
  }

  function saveSettings() {
    if (settings.autopublish && !data.settings.autopublish) {
      const ok = window.confirm(
        "Turn on auto-publish?\n\nDrafts that pass the reviewer gate will go live on the blog without your approval. Social posts still wait in Social Publishing and are never sent automatically."
      );
      if (!ok) return;
    }
    act("save", () => updateContentPipelineConfig(settings));
  }

  function runNow() {
    act("run", async () => {
      const r = await runContentPipelineNow();
      if (!r.ok) return r;
      const s = r.summary;
      const text = s.status === "SKIPPED" ? `Nothing to do: ${s.reason}` : `${s.status === "FAILED" ? "Run failed" : "Run finished"}: ${s.produced} produced, ${s.rejected} rejected, ${s.failed} failed.`;
      return { ok: s.status !== "FAILED", message: text, error: s.reason ? `Run failed: ${s.reason}` : text };
    });
  }

  const lastRun = data.runs[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 font-serif text-3xl font-black tracking-tight text-[#0F2A44]">
            Content Pipeline <Workflow className="h-6 w-6 text-[#2FA4A9]" aria-hidden />
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-600">
            Discovery → topic selection → writer → SEO → fact-check review → cover image → publisher. Runs daily from official sources and stops at{" "}
            {data.settings.piecesPerDay} piece(s) a day.
          </p>
        </div>
        <button
          type="button"
          onClick={runNow}
          disabled={pending || !data.env.openai}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F2A44] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#173b5e] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "run" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
          {busy === "run" ? "Running… (up to 5 min)" : "Run now"}
        </button>
      </header>

      {notice && (
        <div role="status" className={`rounded-xl border px-4 py-3 text-sm font-medium ${notice.tone === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
          {notice.text}
        </div>
      )}

      {/* Status strip */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Pipeline status">
        <div className={`rounded-2xl border p-4 ${data.settings.autopublish ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-white"}`}>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Publishing mode</p>
          <p className="mt-1 text-lg font-black text-[#0F2A44]">{data.settings.autopublish ? "Auto-publish ON" : "Draft only"}</p>
          <p className="mt-1 text-xs text-gray-600">{data.settings.autopublish ? "Passing drafts go live." : "Every post waits for your approval."}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Today (UTC)</p>
          <p className="mt-1 text-lg font-black text-[#0F2A44]">{data.producedToday} / {data.settings.piecesPerDay}</p>
          <p className="mt-1 text-xs text-gray-600">Pieces produced</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Last run</p>
          <p className="mt-1 text-lg font-black text-[#0F2A44]">{lastRun ? lastRun.status : "Never"}</p>
          <p className="mt-1 text-xs text-gray-600">{lastRun ? format(new Date(lastRun.startedAt), "MMM d, HH:mm") + ` · ${lastRun.trigger.toLowerCase()}` : "Daily at 13:00 UTC"}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Server config</p>
          <ul className="mt-1 space-y-1 text-xs">
            {[
              ["OpenAI key", data.env.openai],
              ["CRON_SECRET", data.env.cronSecret],
              ["NEXT_PUBLIC_APP_URL", !!data.env.siteUrl],
            ].map(([label, ok]) => (
              <li key={String(label)} className="flex items-center gap-1.5 font-medium text-gray-700">
                {ok ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-600" aria-hidden />}
                {label} {ok ? "set" : "missing"}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Queue */}
        <section className="rounded-2xl border border-gray-200 bg-white xl:col-span-2" aria-labelledby="queue-heading">
          <div className="flex flex-col gap-3 border-b border-gray-100 p-5 md:flex-row md:items-center md:justify-between">
            <h2 id="queue-heading" className="text-lg font-black text-[#0F2A44]">Queue</h2>
            <div className="flex flex-wrap gap-1.5" role="tablist">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  role="tab"
                  aria-selected={filter === f.key}
                  onClick={() => setFilter(f.key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${filter === f.key ? "bg-[#0F2A44] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                >
                  {f.label} <span className="opacity-70">{counts[f.key]}</span>
                </button>
              ))}
            </div>
          </div>

          {jobs.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500">
              {filter === "review" ? "Nothing waiting for approval. New drafts appear here after each run." : "No jobs in this view."}
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {jobs.map((job) => {
                const open = openJob === job.id;
                return (
                  <li key={job.id} className="p-5">
                    <button type="button" onClick={() => setOpenJob(open ? null : job.id)} aria-expanded={open} className="flex w-full items-start justify-between gap-4 text-left">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${stageTone(job.stage)}`}>{STAGE_LABEL[job.stage] ?? job.stage}</span>
                          {job.qualityScore !== null && <span className="text-xs font-bold text-gray-600">Score {job.qualityScore}</span>}
                          {job.attempts > 1 && <span className="text-xs text-gray-500">Attempt {job.attempts}</span>}
                          {job.immigrationPaths.map((p) => (
                            <span key={p} className="rounded-md bg-[#E5F5F5] px-2 py-0.5 text-[11px] font-semibold text-[#1d6f73]">{p.replace(/_/g, " ")}</span>
                          ))}
                          <span className="text-xs text-gray-400">{format(new Date(job.createdAt), "MMM d, HH:mm")}</span>
                        </div>
                        <p className="font-bold text-[#1A1F2B]">{job.metaTitle || job.topic}</p>
                        <p className="mt-0.5 truncate text-xs text-gray-500">{job.sourceName}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        {!TERMINAL_STAGES.includes(job.stage) && <StageTrack stage={job.stage} />}
                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
                      </div>
                    </button>

                    {open && (
                      <div className="mt-4 space-y-4">
                        {job.rejectionReason && (
                          <p className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">{job.rejectionReason}</p>
                        )}

                        <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                          <div><dt className="text-xs font-bold uppercase text-gray-500">Slug</dt><dd className="font-mono text-xs text-gray-800">{job.slug ? `/blog/${job.slug}` : "—"}</dd></div>
                          <div><dt className="text-xs font-bold uppercase text-gray-500">Target keyword</dt><dd className="text-gray-800">{job.targetKeyword || "—"}</dd></div>
                          <div className="md:col-span-2"><dt className="text-xs font-bold uppercase text-gray-500">Meta description</dt><dd className="text-gray-800">{job.metaDesc || "—"}</dd></div>
                          {job.sourceUrl && (
                            <div className="md:col-span-2">
                              <dt className="text-xs font-bold uppercase text-gray-500">Source</dt>
                              <dd><a href={job.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all text-[#1d6f73] underline">{job.sourceUrl} <ExternalLink className="h-3 w-3 shrink-0" aria-hidden /></a></dd>
                            </div>
                          )}
                        </dl>

                        {job.reviewNotes?.flags && job.reviewNotes.flags.length > 0 && (
                          <div>
                            <h3 className="mb-1 text-xs font-bold uppercase text-gray-500">Reviewer flags</h3>
                            <ul className="list-disc space-y-1 pl-5 text-sm text-gray-800">
                              {job.reviewNotes.flags.map((f, i) => <li key={i}>{f}</li>)}
                            </ul>
                          </div>
                        )}
                        {job.reviewNotes?.editorNote && <p className="text-sm italic text-gray-600">Editor: {job.reviewNotes.editorNote}</p>}

                        {job.draftMarkdown && (
                          <details className="rounded-xl border border-gray-200">
                            <summary className="cursor-pointer px-4 py-2 text-sm font-bold text-[#0F2A44]">Preview draft</summary>
                            <div className="prose prose-sm max-h-[480px] max-w-none overflow-y-auto border-t border-gray-100 p-4 prose-headings:text-[#0F2A44]">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{job.draftMarkdown.replace(/<!--[\s\S]*?-->/g, "").replace(/<end-of-faq>/g, "")}</ReactMarkdown>
                            </div>
                          </details>
                        )}

                        <div className="flex flex-wrap gap-2">
                          {job.stage === "READY" && (
                            <button type="button" disabled={pending} onClick={() => act(`approve-${job.id}`, () => approvePipelineJob(job.id))}
                              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                              {busy === `approve-${job.id}` ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <CheckCircle2 className="h-4 w-4" aria-hidden />} Approve &amp; publish
                            </button>
                          )}
                          {["READY", "PUBLISHED"].includes(job.stage) && (
                            <button type="button" disabled={pending}
                              onClick={() => {
                                const reason = window.prompt(job.stage === "PUBLISHED" ? "Unpublish this post? Optional reason:" : "Reject this draft? Optional reason:", "");
                                if (reason !== null) act(`reject-${job.id}`, () => rejectPipelineJob(job.id, reason));
                              }}
                              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50">
                              <XCircle className="h-4 w-4" aria-hidden /> {job.stage === "PUBLISHED" ? "Unpublish" : "Reject"}
                            </button>
                          )}
                          {["FAILED", "REJECTED"].includes(job.stage) && !job.blogPostId && (
                            <button type="button" disabled={pending || !data.env.openai} onClick={() => act(`retry-${job.id}`, () => retryPipelineJob(job.id))}
                              className="inline-flex items-center gap-2 rounded-lg bg-[#0F2A44] px-4 py-2 text-sm font-bold text-white hover:bg-[#173b5e] disabled:opacity-50">
                              {busy === `retry-${job.id}` ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RotateCcw className="h-4 w-4" aria-hidden />}
                              {busy === `retry-${job.id}` ? "Retrying… (up to 2 min)" : "Retry"}
                            </button>
                          )}
                          {job.stage === "REJECTED" && !job.blogPostId && job.draftMarkdown && (
                            <button type="button" disabled={pending} onClick={() => act(`override-${job.id}`, () => overrideRejectedJob(job.id))}
                              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-800 hover:bg-gray-50 disabled:opacity-50">
                              Keep as unpublished draft
                            </button>
                          )}
                          {job.blogPostId && (
                            <Link href={`/dashboard/admin/blog/${job.blogPostId}`} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-800 hover:bg-gray-50">
                              Edit in Blog Engine
                            </Link>
                          )}
                          {job.stage === "PUBLISHED" && job.slug && (
                            <Link href={`/blog/${job.slug}`} target="_blank" className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-800 hover:bg-gray-50">
                              View post <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                            </Link>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Settings */}
        <section className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5" aria-labelledby="settings-heading">
            <h2 id="settings-heading" className="mb-4 flex items-center gap-2 text-lg font-black text-[#0F2A44]">
              <ShieldCheck className="h-5 w-5 text-[#2FA4A9]" aria-hidden /> Settings
            </h2>

            <div className="space-y-5">
              <div className={`flex items-start justify-between gap-4 rounded-xl border p-3 ${settings.autopublish ? "border-amber-300 bg-amber-50" : "border-gray-200"}`}>
                <div>
                  <p className="text-sm font-bold text-[#1A1F2B]">Auto-publish</p>
                  <p className="text-xs text-gray-600">Off: drafts wait for approval. On: drafts that pass review go live. Social posts are never sent automatically.</p>
                </div>
                <Toggle label="Auto-publish" checked={settings.autopublish} onChange={(v) => setSettings({ ...settings, autopublish: v })} />
              </div>

              <label className="block">
                <span className="text-sm font-bold text-[#1A1F2B]">Content language</span>
                <select value={settings.language} onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#2FA4A9] focus:outline-none">
                  {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                  {!LANGUAGES.some((l) => l.value === settings.language) && <option value={settings.language}>{settings.language}</option>}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-bold text-[#1A1F2B]">Pieces per day</span>
                  <input type="number" min={0} max={10} value={settings.piecesPerDay}
                    onChange={(e) => setSettings({ ...settings, piecesPerDay: Math.max(0, Math.min(10, parseInt(e.target.value || "0", 10))) })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#2FA4A9] focus:outline-none" />
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-[#1A1F2B]">Review strictness</span>
                  <select value={settings.strictness} onChange={(e) => setSettings({ ...settings, strictness: e.target.value as Settings["strictness"] })}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#2FA4A9] focus:outline-none">
                    <option value="lenient">Lenient (60+)</option>
                    <option value="standard">Standard (70+)</option>
                    <option value="strict">Strict (80+)</option>
                  </select>
                </label>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-[#1A1F2B]">Generate cover images</p>
                  <p className="text-xs text-gray-600">Turn off to save image costs; you can add images in the Blog Engine.</p>
                </div>
                <Toggle label="Generate cover images" checked={settings.imagesEnabled} onChange={(v) => setSettings({ ...settings, imagesEnabled: v })} />
              </div>

              <fieldset>
                <legend className="text-sm font-bold text-[#1A1F2B]">Social channels to queue</legend>
                <p className="mb-2 text-xs text-gray-600">Enabled channels get a queued post you approve and send from Social Publishing. Disabled ones are marked skipped.</p>
                <div className="space-y-2">
                  {(Object.keys(CHANNEL_LABEL) as (keyof typeof CHANNEL_LABEL)[]).map((c) => (
                    <div key={c} className="flex items-center justify-between">
                      <span className="text-sm text-gray-800">{CHANNEL_LABEL[c]}</span>
                      <Toggle label={CHANNEL_LABEL[c]} checked={settings.channels[c]} onChange={(v) => setSettings({ ...settings, channels: { ...settings.channels, [c]: v } })} />
                    </div>
                  ))}
                </div>
              </fieldset>

              <button type="button" onClick={saveSettings} disabled={!dirty || pending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2FA4A9] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#258d92] disabled:cursor-not-allowed disabled:opacity-50">
                {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />} Save settings
              </button>
            </div>
          </div>

          {/* Sources */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5" aria-labelledby="sources-heading">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="sources-heading" className="flex items-center gap-2 text-lg font-black text-[#0F2A44]"><Rss className="h-5 w-5 text-[#2FA4A9]" aria-hidden /> Sources</h2>
              <Link href="/dashboard/admin/news-aggregator" className="text-xs font-bold text-[#1d6f73] underline">Add / edit</Link>
            </div>
            {data.sources.length === 0 ? (
              <p className="text-sm text-gray-600">No sources yet. Run <code className="rounded bg-gray-100 px-1">npx tsx scripts/seed-content-sources.ts</code> or add one in the News Aggregator.</p>
            ) : (
              <ul className="space-y-3">
                {data.sources.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#1A1F2B]">{s.name}</p>
                      <p className="truncate text-xs text-gray-500">{s.type} · {s.lastCheckedAt ? `checked ${format(new Date(s.lastCheckedAt), "MMM d")}` : "never checked"}</p>
                    </div>
                    <Toggle label={`Enable ${s.name}`} checked={s.enabled} disabled={pending} onChange={(v) => act(`src-${s.id}`, () => setContentSourceEnabled(s.id, v))} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* Runs */}
      <section className="rounded-2xl border border-gray-200 bg-white" aria-labelledby="runs-heading">
        <h2 id="runs-heading" className="border-b border-gray-100 p-5 text-lg font-black text-[#0F2A44]">Run history</h2>
        {data.runs.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-500">No runs yet. The cron runs daily at 13:00 UTC, or use Run now.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {data.runs.map((r) => (
              <li key={r.id} className="p-4">
                <button type="button" onClick={() => setOpenRun(openRun === r.id ? null : r.id)} aria-expanded={openRun === r.id} className="flex w-full flex-wrap items-center justify-between gap-3 text-left">
                  <span className="flex items-center gap-3">
                    <span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${r.status === "COMPLETED" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : r.status === "FAILED" ? "border-red-200 bg-red-50 text-red-700" : "border-sky-200 bg-sky-50 text-sky-700"}`}>{r.status}</span>
                    <span className="text-sm font-bold text-[#1A1F2B]">{format(new Date(r.startedAt), "MMM d, yyyy HH:mm")}</span>
                    <span className="text-xs text-gray-500">{r.trigger.toLowerCase()} · {r.language}{r.autoPublished ? " · auto-publish" : ""}</span>
                  </span>
                  <span className="text-xs text-gray-600">
                    {r.discovered} found · {r.selected} selected · {r.published} produced · {r.skipped} rejected · {r.failed} failed
                  </span>
                </button>
                {openRun === r.id && (
                  <ol className="mt-3 max-h-64 space-y-1 overflow-y-auto rounded-lg bg-gray-50 p-3 font-mono text-xs text-gray-700">
                    {r.error && <li className="text-red-700">{r.error}</li>}
                    {r.log.map((l, i) => <li key={i}>{l}</li>)}
                  </ol>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
