import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { requireAdminPage } from "./_lib/guard";
import { getAdminOverview } from "./_lib/overview";
import { ADMIN_NAV } from "./_lib/nav";
import { AdminCard, AdminPageHeader, AdminShell, StatusPill, AdminButtonLink, type Tone } from "./_components/AdminUI";

function fmt(value: number | null, format?: "money") {
  if (value == null) return "—";
  if (format === "money") return `$${Math.round(value / 100).toLocaleString()}`;
  return value.toLocaleString();
}

const RUN_TONE: Record<string, Tone> = { COMPLETED: "success", RUNNING: "info", FAILED: "error" };

export default async function AdminHome() {
  await requireAdminPage();
  const data = await getAdminOverview();

  const open = data.actions.filter((a) => (a.count ?? 0) > 0);
  const clear = data.actions.filter((a) => a.count === 0);
  const unknown = data.actions.filter((a) => a.count == null);

  return (
    <AdminShell>
      <AdminPageHeader
        section="Admin"
        title="Overview"
        description="What needs a decision today, then the numbers. Counts are live from the database."
        actions={<AdminButtonLink href="/dashboard/admin/logs">Activity log</AdminButtonLink>}
      />

      {/* Needs action */}
      <AdminCard className="mb-6">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-black text-navy">Needs action</h2>
          <span className="text-xs text-gray-500">
            {open.length === 0 ? "Nothing waiting" : `${open.length} queue${open.length === 1 ? "" : "s"} waiting`}
          </span>
        </div>
        {open.length === 0 ? (
          <div className="flex items-center gap-3 px-5 py-6 text-sm text-gray-600">
            <CheckCircle2 className="h-5 w-5 text-success" aria-hidden /> All queues are clear.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {open.map((a) => (
              <li key={a.key}>
                <Link href={a.href} className="flex items-center gap-4 px-5 py-3 hover:bg-mist">
                  <span className="w-12 text-right text-xl font-black tabular-nums text-navy">{fmt(a.count)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-ink">{a.label}</span>
                    <span className="block text-xs text-gray-500">{a.hint}</span>
                  </span>
                  <StatusPill tone={a.tone}>Open</StatusPill>
                  <ArrowRight className="h-4 w-4 text-gray-400" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {(clear.length > 0 || unknown.length > 0) && (
          <p className="border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
            {clear.length > 0 && <>Clear: {clear.map((a) => a.label.toLowerCase()).join(", ")}. </>}
            {unknown.length > 0 && <>Could not load: {unknown.map((a) => a.label.toLowerCase()).join(", ")}.</>}
          </p>
        )}
      </AdminCard>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {data.kpis.map((k) => (
          <AdminCard key={k.label} className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{k.label}</p>
            <p className="mt-1 text-2xl font-black tabular-nums text-navy">{fmt(k.value, k.format)}</p>
            {k.sub ? <p className="mt-0.5 text-xs text-gray-500">{k.sub}</p> : null}
          </AdminCard>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Pipeline status */}
        <AdminCard className="p-5">
          <h2 className="mb-3 text-base font-black text-navy">Content pipeline</h2>
          {data.lastRun ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <StatusPill tone={RUN_TONE[data.lastRun.status] ?? "neutral"}>{data.lastRun.status}</StatusPill>
                <span className="text-gray-500">{formatDistanceToNow(data.lastRun.startedAt)} ago</span>
              </div>
              <p className="text-gray-600">
                {data.lastRun.published} produced · {data.lastRun.failed} failed
              </p>
              {data.lastRun.error ? <p className="line-clamp-3 text-xs text-error">{data.lastRun.error}</p> : null}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No runs recorded yet.</p>
          )}
          <Link href="/dashboard/admin/content-pipeline" className="mt-4 inline-block text-xs font-bold text-softblue hover:text-navy">
            Open pipeline →
          </Link>
        </AdminCard>

        {/* Recent activity */}
        <AdminCard className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-black text-navy">Recent activity</h2>
            <Link href="/dashboard/admin/logs" className="text-xs font-bold text-softblue hover:text-navy">All activity →</Link>
          </div>
          {data.recentLogs.length === 0 ? (
            <p className="text-sm text-gray-500">No events yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100 text-sm">
              {data.recentLogs.map((l) => (
                <li key={l.id} className="flex items-center gap-3 py-2">
                  <span className="font-mono text-[11px] font-bold text-[#1d6f73]">{l.action}</span>
                  <span className="min-w-0 flex-1 truncate text-gray-600">{l.who}</span>
                  <span className="shrink-0 text-xs text-gray-400">{formatDistanceToNow(l.createdAt)} ago</span>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      </div>

      {/* Tool index — same structure as the sidebar */}
      <h2 className="mb-3 text-base font-black text-navy">All admin tools</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ADMIN_NAV.filter((g) => g.label !== "Overview").map((g) => (
          <AdminCard key={g.label} className="p-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-teal">{g.label}</p>
            <ul className="space-y-1">
              {g.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link href={item.href} className="flex items-start gap-3 rounded-lg p-2 hover:bg-mist">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-softblue" aria-hidden />
                      <span>
                        <span className="block text-sm font-bold text-ink">{item.label}</span>
                        <span className="block text-xs text-gray-500">{item.hint}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </AdminCard>
        ))}
      </div>
    </AdminShell>
  );
}
