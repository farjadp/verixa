import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { AlertCircle, Clock, ShieldAlert, FileWarning, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default async function ActionableQueues() {
  const [pendingReviews, pendingVerifications, stuckBookings] = await Promise.all([
    prisma.review.findMany({
      where: { status: "PENDING_MODERATION" },
      include: { user: true, profile: true },
      take: 5,
      orderBy: { createdAt: "asc" } // Oldest first (longest waiting)
    }),
    prisma.consultantProfile.findMany({
      where: { status: { in: ["Pending", "Verification Pending"] } },
      take: 5,
      orderBy: { createdAt: "asc" }
    }),
    prisma.booking.findMany({
      where: { status: "PENDING" },
      include: { profile: true },
      take: 5,
      orderBy: { createdAt: "asc" } // Oldest pending bookings
    })
  ]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      {/* 1. Pending Verifications (Claims) */}
      <div className="bg-[#1A1A1A] border border-orange-500/20 rounded-3xl p-5 shadow-2xl relative flex flex-col">
        <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
          <ShieldAlert className="w-5 h-5 text-orange-400" />
          <h3 className="text-white font-bold font-serif text-sm">Verifications Awaiting</h3>
          <span className="ml-auto bg-orange-500/10 text-orange-400 text-[10px] px-2 py-0.5 rounded-full font-bold">{pendingVerifications.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-3">
          {pendingVerifications.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">No pending verifications.</p>
          ) : (
            pendingVerifications.map(p => (
              <div key={p.id} className="group flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5 hover:border-orange-500/30 transition-colors">
                <div>
                  <p className="text-xs text-white font-bold">{p.fullName}</p>
                  <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-1">
                     <Clock className="w-3 h-3 text-orange-400/70" /> {formatDistanceToNow(p.createdAt)} ago
                  </p>
                </div>
                <Link href={`/dashboard/admin/claims/${p.id}`} className="p-1.5 bg-white/5 rounded-lg hover:bg-orange-500/20 text-gray-400 hover:text-orange-400 transition-colors">
                  <Eye className="w-4 h-4" />
                </Link>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. Flagged / Pending Reviews */}
      <div className="bg-[#1A1A1A] border border-red-500/20 rounded-3xl p-5 shadow-2xl relative flex flex-col">
        <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
          <FileWarning className="w-5 h-5 text-red-500" />
          <h3 className="text-white font-bold font-serif text-sm">Review Moderation</h3>
          <span className="ml-auto bg-red-500/10 text-red-500 text-[10px] px-2 py-0.5 rounded-full font-bold">{pendingReviews.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-3">
          {pendingReviews.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">Review queue is empty.</p>
          ) : (
            pendingReviews.map(r => (
              <div key={r.id} className="group flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5 hover:border-red-500/30 transition-colors">
                <div className="max-w-[70%]">
                  <p className="text-xs text-white font-bold truncate">For: {r.profile.fullName}</p>
                  <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-1">
                     <AlertCircle className="w-3 h-3 text-red-500/70" /> {r.rating} Stars
                  </p>
                </div>
                <Link href={`/dashboard/admin/reviews/${r.id}`} className="p-1.5 bg-white/5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-500 transition-colors">
                  <Eye className="w-4 h-4" />
                </Link>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. Stuck Bookings */}
      <div className="bg-[#1A1A1A] border border-yellow-500/20 rounded-3xl p-5 shadow-2xl relative flex flex-col">
        <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
          <Clock className="w-5 h-5 text-yellow-500" />
          <h3 className="text-white font-bold font-serif text-sm">Stuck / Unanswered Bookings</h3>
          <span className="ml-auto bg-yellow-500/10 text-yellow-500 text-[10px] px-2 py-0.5 rounded-full font-bold">{stuckBookings.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-3">
          {stuckBookings.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">No stuck bookings.</p>
          ) : (
            stuckBookings.map(b => (
              <div key={b.id} className="group flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5 hover:border-yellow-500/30 transition-colors">
                <div className="max-w-[70%]">
                  <p className="text-xs text-white font-bold truncate">{b.profile.fullName}</p>
                  <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-1 truncate">
                     Client: {b.userFirstName} {b.userLastName}
                  </p>
                </div>
                <Link href={`/dashboard/admin/bookings/${b.id}`} className="p-1.5 bg-white/5 rounded-lg hover:bg-yellow-500/20 text-gray-400 hover:text-yellow-500 transition-colors">
                  <Eye className="w-4 h-4" />
                </Link>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
