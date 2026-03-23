// ============================================================================
// Hardware Source: dashboard/admin/users/page.tsx
// Route: /dashboard/admin/users
// Version: 1.0.0 — 2026-03-23
// Why: Route entry for /dashboard/admin/users (structured for SEO, trust, and conversion)
// Env / Identity: React Server Component
// Owner: Verixa Web
// Notes: Keep structure consistent; every section must support Traffic -> Trust -> Booking
// ============================================================================

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Search, ShieldAlert, UserX, Activity, Mail } from "lucide-react";
import { format } from "date-fns";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    where: { role: "CLIENT" },
    include: {
      _count: {
        select: { savedProfiles: true, reviews: true }
      },
      systemLogs: { 
        take: 1, 
        orderBy: { createdAt: "desc" } 
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-black text-white tracking-tight">Client Health & Users</h1>
          <p className="text-gray-400 mt-1 font-light text-sm">Monitor end-user activity, bans, and access controls.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search User or Email..." 
              className="pl-9 pr-4 py-2 bg-[#1A1A1A] border border-gray-800 rounded-lg text-sm text-white focus:outline-none focus:border-gray-500 w-64"
            />
          </div>
        </div>
      </div>

      <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#222] text-gray-400 text-xs uppercase tracking-wider border-b border-gray-800">
              <tr>
                <th className="px-6 py-4 font-bold">User Details</th>
                <th className="px-6 py-4 font-bold">Registration Date</th>
                <th className="px-6 py-4 font-bold">Platform Usage</th>
                <th className="px-6 py-4 font-bold">Last Activity</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-gray-300">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-white">{u.name || "No Name Provided"}</div>
                    <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3" /> {u.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    {format(new Date(u.createdAt), "MMM d, yyyy")}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 text-[11px]">
                      <span><b className="text-white">{u._count.savedProfiles}</b> Profile Saves</span>
                      <span><b className="text-white">{u._count.reviews}</b> Reviews Left</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {u.systemLogs.length > 0 ? (
                       <span className="flex items-center gap-1.5" title={u.systemLogs[0].action}>
                         <Activity className="w-3 h-3 text-blue-400" /> {format(new Date(u.systemLogs[0].createdAt), "MMM d HH:mm")}
                       </span>
                    ) : (
                       "No Log Activity"
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded bg-green-500/10 text-green-400`}>
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2">
                       <button className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded transition-colors" title="View Audit Trail">
                         <ShieldAlert className="w-4 h-4" />
                       </button>
                       <button className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded transition-colors" title="Suspend Account">
                         <UserX className="w-4 h-4" />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
              
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No active clients found.
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
