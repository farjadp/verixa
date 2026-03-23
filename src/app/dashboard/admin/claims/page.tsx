// ============================================================================
// Hardware Source: dashboard/admin/claims/page.tsx
// Route: /dashboard/admin/claims
// Version: 1.0.0 — 2026-03-23
// Why: Route entry for /dashboard/admin/claims (structured for SEO, trust, and conversion)
// Env / Identity: React Server Component
// Owner: Verixa Web
// Notes: Keep structure consistent; every section must support Traffic -> Trust -> Booking
// ============================================================================

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Search, Filter, ShieldAlert, CheckCircle, XCircle, FileText, ShieldCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default async function AdminClaimsPage() {
  const pendingClaims = await prisma.consultantProfile.findMany({
    where: { status: { in: ["Pending", "Verification Pending"] } },
    include: {
      user: { select: { email: true, name: true } }
    },
    orderBy: { createdAt: "asc" }
  });

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-black text-white tracking-tight">Claim Requests</h1>
          <p className="text-gray-400 mt-1 font-light text-sm">Security pipeline for verifying consultant identities.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search Name or Email..." 
              className="pl-9 pr-4 py-2 bg-[#0F2A44] border border-gray-800 rounded-lg text-sm text-white focus:outline-none focus:border-gray-500 w-64"
            />
          </div>
        </div>
      </div>

      <div className="bg-[#0F2A44] border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#222] text-gray-400 text-xs uppercase tracking-wider border-b border-gray-800">
              <tr>
                <th className="px-6 py-4 font-bold">Consultant Name</th>
                <th className="px-6 py-4 font-bold">License #</th>
                <th className="px-6 py-4 font-bold">Submitted By</th>
                <th className="px-6 py-4 font-bold">Submitted At</th>
                <th className="px-6 py-4 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-gray-300">
              {pendingClaims.map((c) => (
                <tr key={c.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-bold text-white">{c.fullName}</td>
                  <td className="px-6 py-4 font-mono text-orange-400">{c.licenseNumber}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm">{c.user?.name || "Unknown"}</div>
                    <div className="text-[10px] text-gray-500">{c.user?.email || "No Email"}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    <span className="flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5 text-orange-500" /> {formatDistanceToNow(new Date(c.createdAt))} ago</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      <button className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-500 text-xs font-bold rounded flex items-center gap-1 transition-colors">
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold rounded flex items-center gap-1 transition-colors">
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                      <button className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded transition-colors" title="View Docs">
                        <FileText className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {pendingClaims.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <ShieldCheck className="w-12 h-12 text-green-500/50 mx-auto mb-3" />
                    <p className="text-gray-400 font-bold">Zero Pending Claims</p>
                    <p className="text-xs text-gray-500 mt-1">All profiles have been verified or rejected.</p>
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
