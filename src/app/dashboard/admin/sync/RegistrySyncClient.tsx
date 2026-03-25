"use client";
// ============================================================================
// RegistrySyncClient.tsx
// Version: 1.0.0 — 2026-03-25
// Why: Interactive sync UI. Shows scraper vs Verixa stats, sync options, and
//      a live results panel after running sync.
// ============================================================================

import { useState, useTransition } from "react";
import { runRegistrySync, saveLastSyncLog, type SyncResult, type SyncPreview } from "@/actions/sync.actions";
import { RefreshCw, CheckCircle2, AlertCircle, SkipForward, Plus, Edit, Clock, Database, Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  preview: SyncPreview | null;
  lastSync: (SyncResult & { syncedAt: string }) | null;
}

export default function RegistrySyncClient({ preview, lastSync }: Props) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<SyncResult | null>(null);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  // Options
  const [onlyNew, setOnlyNew]       = useState(false);
  const [activeOnly, setActiveOnly] = useState(true);
  const [limitMode, setLimitMode]   = useState<"all" | "test">("all");

  const handleSync = () => {
    startTransition(async () => {
      const res = await runRegistrySync({
        onlyNew,
        activeOnly,
        limit: limitMode === "test" ? 50 : undefined,
      });
      await saveLastSyncLog(res);
      setResult(res);
      setSyncedAt(new Date().toISOString());
    });
  };

  const displayResult = result ?? lastSync;
  const displayedAt = syncedAt ?? lastSync?.syncedAt;

  return (
    <div className="space-y-6">

      {/* REGISTRY STATS OVERVIEW */}
      {preview ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "CICC Registry",    value: preview.registryTotal.toLocaleString(),  sub: "Total scraped",        icon: Database,      color: "text-[#0F2A44]" },
            { label: "Scrape Done",      value: preview.registryDone.toLocaleString(),   sub: "Have email & phone",   icon: CheckCircle2,  color: "text-teal-600"  },
            { label: "Pending Scrape",   value: preview.registryPending.toLocaleString(), sub: "Not yet scraped",     icon: Clock,         color: "text-orange-500"},
            { label: "In Verixa",        value: preview.verixaTotal.toLocaleString(),    sub: "Imported profiles",    icon: RefreshCw,     color: "text-blue-600"  },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest mb-2 ${stat.color}`}>
                <stat.icon className="w-3.5 h-3.5" />
                {stat.label}
              </div>
              <div className="text-3xl font-black text-[#0F2A44]">{stat.value}</div>
              <div className="text-xs text-gray-400 mt-1">{stat.sub}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-sm text-red-700">
          ⚠️ Could not connect to CICC scraper database. Make sure <code>cicc_data.db</code> exists at <code>../cicc_scraper/cicc_data.db</code>.
        </div>
      )}

      {/* SYNC PREVIEW ROW */}
      {preview && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 flex items-center gap-4">
            <Plus className="w-8 h-8 text-teal-500 shrink-0" />
            <div>
              <div className="text-2xl font-black text-teal-700">{preview.newCount.toLocaleString()}</div>
              <div className="text-sm font-bold text-teal-600">New profiles to import</div>
              <div className="text-xs text-teal-500 mt-0.5">In CICC registry but not yet in Verixa</div>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-center gap-4">
            <Edit className="w-8 h-8 text-blue-500 shrink-0" />
            <div>
              <div className="text-2xl font-black text-blue-700">{preview.updateCount.toLocaleString()}</div>
              <div className="text-sm font-bold text-blue-600">Profiles to check for updates</div>
              <div className="text-xs text-blue-500 mt-0.5">Already in Verixa — will update if changed</div>
            </div>
          </div>
        </div>
      )}

      {/* SYNC OPTIONS + RUN */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="font-bold text-[#0F2A44] mb-4">Sync Options</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Only new */}
          <label className={`flex flex-col gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${onlyNew ? "border-[#2FA4A9] bg-[#E5F5F5]" : "border-gray-200 hover:border-gray-300"}`}>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={onlyNew} onChange={(e) => setOnlyNew(e.target.checked)} className="accent-[#2FA4A9] w-4 h-4" />
              <span className="font-bold text-sm text-[#0F2A44]">New Only</span>
            </div>
            <p className="text-xs text-gray-500">Skip any profile already in Verixa. Faster — no update checks.</p>
          </label>

          {/* Active only */}
          <label className={`flex flex-col gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${activeOnly ? "border-[#2FA4A9] bg-[#E5F5F5]" : "border-gray-200 hover:border-gray-300"}`}>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} className="accent-[#2FA4A9] w-4 h-4" />
              <span className="font-bold text-sm text-[#0F2A44]">Active Only</span>
            </div>
            <p className="text-xs text-gray-500">Only import consultants with Status = "Active". Excludes suspended/cancelled.</p>
          </label>

          {/* Test mode */}
          <label className={`flex flex-col gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${limitMode === "test" ? "border-orange-300 bg-orange-50" : "border-gray-200 hover:border-gray-300"}`}>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={limitMode === "test"} onChange={(e) => setLimitMode(e.target.checked ? "test" : "all")} className="accent-orange-500 w-4 h-4" />
              <span className="font-bold text-sm text-[#0F2A44]">Test Mode (50)</span>
            </div>
            <p className="text-xs text-gray-500">Limit to first 50 records. Use to verify sync logic before running full import.</p>
          </label>
        </div>

        <button
          onClick={handleSync}
          disabled={isPending || !preview}
          className="w-full flex items-center justify-center gap-3 py-3.5 bg-[#0F2A44] text-white rounded-xl font-bold text-sm hover:bg-black transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Syncing — please wait…</>
          ) : (
            <><RefreshCw className="w-5 h-5" /> Run Registry Sync</>
          )}
        </button>
      </div>

      {/* LAST SYNC RESULT */}
      {displayResult && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-[#0F2A44]">
                {result ? "Sync Complete ✅" : "Last Sync Result"}
              </h2>
              {displayedAt && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(displayedAt).toLocaleString("en-CA", {
                    dateStyle: "medium", timeStyle: "short"
                  })} · {(displayResult.durationMs / 1000).toFixed(1)}s
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-gray-100">
            {[
              { label: "Processed",  value: displayResult.total,    icon: Database,      color: "text-gray-600"  },
              { label: "Imported",   value: displayResult.imported,  icon: Plus,          color: "text-teal-600"  },
              { label: "Updated",    value: displayResult.updated,   icon: Edit,          color: "text-blue-600"  },
              { label: "Skipped",    value: displayResult.skipped,   icon: SkipForward,   color: "text-gray-400"  },
              { label: "Errors",     value: displayResult.errors,    icon: AlertCircle,   color: "text-red-500"   },
            ].map((s) => (
              <div key={s.label} className="p-5 text-center">
                <s.icon className={`w-5 h-5 mx-auto mb-1.5 ${s.color}`} />
                <div className={`text-2xl font-black ${s.color}`}>{s.value.toLocaleString()}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {displayResult.errors > 0 && displayResult.errorDetails.length > 0 && (
            <div className="border-t border-gray-100">
              <button
                onClick={() => setShowErrors(!showErrors)}
                className="w-full flex items-center justify-between px-6 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
              >
                <span>View {displayResult.errorDetails.length} Error{displayResult.errorDetails.length > 1 ? "s" : ""}</span>
                {showErrors ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showErrors && (
                <div className="px-6 pb-4 space-y-1 max-h-48 overflow-y-auto">
                  {displayResult.errorDetails.map((e, i) => (
                    <div key={i} className="text-xs font-mono bg-red-50 px-3 py-2 rounded-lg text-red-700 border border-red-100">
                      {e}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
