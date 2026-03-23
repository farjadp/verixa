// ============================================================================
// Hardware Source: dashboard/admin/bookings/page.tsx
// Route: /dashboard/admin/bookings
// Version: 1.0.0 — 2026-03-23
// Why: Route entry for /dashboard/admin/bookings (structured for SEO, trust, and conversion)
// Env / Identity: React Server Component
// Owner: Verixa Web
// Notes: Keep structure consistent; every section must support Traffic -> Trust -> Booking
// ============================================================================

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Search, Filter, MoreVertical, CreditCard, Video, PhoneCall, Users } from "lucide-react";
import { format } from "date-fns";

export default async function AdminBookingsPage() {
  const bookings = await prisma.booking.findMany({
    include: {
      profile: { select: { fullName: true } },
      type: { select: { title: true } }
    },
    orderBy: { scheduledStart: "desc" }
  });

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-black text-white tracking-tight">Global Bookings</h1>
          <p className="text-gray-400 mt-1 font-light text-sm">Oversight of all transactions and appointments.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search Booking ID..." 
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
                <th className="px-6 py-4 font-bold">Booking ID</th>
                <th className="px-6 py-4 font-bold">Consultant</th>
                <th className="px-6 py-4 font-bold">Client</th>
                <th className="px-6 py-4 font-bold">Date & Time</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold">Financials</th>
                <th className="px-6 py-4 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-gray-300">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-mono text-[10px] text-gray-500">{b.id.slice(-8)}</td>
                  <td className="px-6 py-4 font-bold text-white">{b.profile.fullName}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold">{b.userFirstName} {b.userLastName}</div>
                    <div className="text-[10px] text-gray-500">{b.userEmail}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    <div>{format(new Date(b.scheduledStart), 'MMM d, yyyy')}</div>
                    <div className="text-[10px]">{format(new Date(b.scheduledStart), 'HH:mm')} - {format(new Date(b.scheduledEnd), 'HH:mm')}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded ${
                      b.status === "CONFIRMED" ? "bg-green-500/10 text-green-400" :
                      b.status === "PENDING" ? "bg-yellow-500/10 text-yellow-400" :
                      b.status === "COMPLETED" ? "bg-blue-500/10 text-blue-400" :
                      "bg-gray-500/10 text-gray-400"
                    }`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-white font-mono">${(b.grossAmountCents / 100).toFixed(2)}</span>
                      <span className="text-[10px] text-green-500 border border-green-500/20 bg-green-500/10 px-1 mt-1 rounded w-fit">
                        Fee: ${(b.platformFeeCents / 100).toFixed(2)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button className="p-1.5 text-gray-500 hover:text-white rounded-md hover:bg-white/10 transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No bookings found.
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
