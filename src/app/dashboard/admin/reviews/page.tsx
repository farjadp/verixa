// ============================================================================
// Hardware Source: src/app/dashboard/admin/reviews/page.tsx
// Route: /dashboard/admin/reviews
// Version: 1.0.0 — 2026-04-08
// Why: High-privilege admin route for platform governance, operations, and configuration workflows.
// Domain: Admin Operations
// Env / Identity: React Server Component
// Owner: Verixa Web
// Notes: Must remain server-auth gated for ADMIN users; avoid exposing privileged operations to client without checks.
// Critical Path: Privileged management surface affecting platform-wide data, policy, and operational behavior.
// Security Notes: Enforce ADMIN authorization server-side before reads/writes and before rendering sensitive payloads.
// Risk Notes: Regressions here can impact many users; prefer explicit guards and resilient fallbacks for DB calls.
// ============================================================================
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Search, Eye, AlertCircle, CheckCircle, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default async function AdminReviewsPage() {
  const reviews = await prisma.review.findMany({
    include: {
      profile: { select: { fullName: true } },
      user: { select: { name: true, email: true } },
      booking: { select: { id: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-black text-white tracking-tight">Reviews Moderation</h1>
          <p className="text-gray-400 mt-1 font-light text-sm">Review queue and published feedback oversight.</p>
        </div>
      </div>

      <div className="bg-[#0F2A44] border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#222] text-gray-400 text-xs uppercase tracking-wider border-b border-gray-800">
              <tr>
                <th className="px-6 py-4 font-bold">Rating & Text</th>
                <th className="px-6 py-4 font-bold">Consultant</th>
                <th className="px-6 py-4 font-bold">Reviewer</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-gray-300">
              {reviews.map((r) => (
                <tr key={r.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 mb-1 text-yellow-400">
                       {'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}
                    </div>
                    <div className="text-xs text-gray-400 truncate max-w-xs">{r.comment || "No comment provided"}</div>
                  </td>
                  <td className="px-6 py-4 font-bold text-white">{r.profile.fullName}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm">{r.user.name || "Unknown"}</div>
                    <div className="text-[10px] text-gray-500 flex items-center gap-1">
                      {r.booking ? <span className="bg-green-500/10 text-green-400 px-1 rounded">Verified Trip</span> : null}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded ${
                      r.status === "PUBLISHED" ? "bg-blue-500/10 text-blue-400" :
                      r.status === "PENDING_MODERATION" ? "bg-orange-500/10 text-orange-400" :
                      "bg-gray-500/10 text-gray-400"
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2">
                       {r.status === "PENDING_MODERATION" && (
                         <button className="p-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded transition-colors" title="Publish">
                           <CheckCircle className="w-4 h-4" />
                         </button>
                       )}
                       <button className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded transition-colors" title="Remove">
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
              
              {reviews.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No reviews in the system.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
