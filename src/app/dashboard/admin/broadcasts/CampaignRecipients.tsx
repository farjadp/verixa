"use client";

import { useState, useEffect } from "react";
import { getCampaignRecipients } from "@/actions/broadcast.actions";
import { CheckCircle, XCircle, Clock, AlertTriangle, ChevronLeft, ChevronRight, Search } from "lucide-react";

interface Props { campaignId: string; onClose: () => void; }

const STATUS_STYLES: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  SENT:       { icon: <Clock className="w-3 h-3" />,         color: "text-blue-400",  bg: "bg-blue-400/10" },
  DELIVERED:  { icon: <CheckCircle className="w-3 h-3" />,   color: "text-green-400", bg: "bg-green-400/10" },
  FAILED:     { icon: <XCircle className="w-3 h-3" />,       color: "text-red-400",   bg: "bg-red-400/10" },
  BOUNCED:    { icon: <AlertTriangle className="w-3 h-3" />, color: "text-amber-400", bg: "bg-amber-400/10" },
  COMPLAINED: { icon: <AlertTriangle className="w-3 h-3" />, color: "text-red-500",   bg: "bg-red-500/10" },
};

export default function CampaignRecipients({ campaignId, onClose }: Props) {
  const [data, setData] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setData(null);
    getCampaignRecipients(campaignId, page, 50).then(setData);
  }, [campaignId, page]);

  const filtered = data?.recipients?.filter((r: any) =>
    !search || r.email.toLowerCase().includes(search.toLowerCase()) || (r.name || "").toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const counts = data?.recipients?.reduce((acc: any, r: any) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {}) ?? {};

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0F2A44] border border-gray-700 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Campaign Recipients</h2>
            <p className="text-gray-400 text-sm mt-0.5">
              {data ? `${data.total.toLocaleString()} total` : "Loading..."}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition text-sm font-bold px-4 py-2 bg-black/20 rounded-xl">
            × Close
          </button>
        </div>

        {/* Stats bar */}
        {data && (
          <div className="flex gap-3 px-6 py-4 border-b border-gray-800">
            {Object.entries(STATUS_STYLES).map(([status, style]) => {
              const count = counts[status] || 0;
              if (count === 0) return null;
              return (
                <div key={status} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${style.bg} ${style.color}`}>
                  {style.icon} {status} <span className="text-white/80">{count}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Search */}
        <div className="px-6 py-3 border-b border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search email or name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-black/30 border border-gray-700 pl-10 pr-4 py-2.5 rounded-xl text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#2FA4A9]"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {!data ? (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">No results</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-gray-500 border-b border-gray-800">
                  <th className="text-left px-6 py-3 font-bold">#</th>
                  <th className="text-left px-3 py-3 font-bold">Email</th>
                  <th className="text-left px-3 py-3 font-bold">Name</th>
                  <th className="text-left px-3 py-3 font-bold">Status</th>
                  <th className="text-left px-3 py-3 font-bold">Sent</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r: any, i: number) => {
                  const style = STATUS_STYLES[r.status] ?? STATUS_STYLES.SENT;
                  return (
                    <tr key={r.id} className="border-b border-gray-800/50 hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-3 text-gray-600 text-xs">{(page - 1) * 50 + i + 1}</td>
                      <td className="px-3 py-3 text-[#2FA4A9] font-mono text-xs">{r.email}</td>
                      <td className="px-3 py-3 text-gray-300 text-xs">{r.name || <span className="text-gray-600">—</span>}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${style.bg} ${style.color}`}>
                          {style.icon} {r.status}
                        </span>
                        {r.errorMessage && (
                          <p className="text-[10px] text-red-400 mt-0.5 max-w-[180px] truncate">{r.errorMessage}</p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between">
            <span className="text-xs text-gray-500">Page {page} of {data.totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-2 rounded-lg bg-black/20 border border-gray-700 text-gray-400 hover:text-white disabled:opacity-30 transition">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages}
                className="p-2 rounded-lg bg-black/20 border border-gray-700 text-gray-400 hover:text-white disabled:opacity-30 transition">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
