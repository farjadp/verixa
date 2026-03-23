// ============================================================================
// Hardware Source: dashboard/activity/page.tsx
// Route: /dashboard/activity
// Version: 1.0.0 — 2026-03-23
// Why: Route entry for /dashboard/activity (structured for SEO, trust, and conversion)
// Env / Identity: React Server Component
// Owner: Verixa Web
// Notes: Keep structure consistent; every section must support Traffic -> Trust -> Booking
// ============================================================================

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Activity, Clock } from "lucide-react";
import { format } from "date-fns";

export default async function ActivityFeedPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email }});
  if (!user) redirect("/login");

  const logs = await prisma.systemLog.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
         <h1 className="text-3xl font-serif font-bold text-[#1A1F2B]">Account Activity</h1>
         <p className="text-gray-500 mt-2">A history of actions performed on your Verixa account.</p>
      </div>

      <div className="bg-white rounded-[32px] border border-[#e5e7eb] shadow-sm overflow-hidden p-8">
        {logs.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
             No activity recorded yet.
          </div>
        ) : (
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-100 before:to-transparent">
            {logs.map((log, index) => {
              const actionLabels: Record<string, string> = {
                "USER_LOGIN": "Logged into account",
                "PROFILE_UPDATED": "Updated account settings",
                "PASSWORD_CHANGED": "Changed password",
                "BOOKING_REQUESTED": "Requested a new consultation",
                "BOOKING_CONFIRMED": "Booking marked as confirmed",
                "BOOKING_COMPLETED": "Booking marked as completed",
                "REVIEW_SUBMITTED": "Submitted a consultation review",
              };

              const label = actionLabels[log.action] || log.action;

              return (
                <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                   <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-[#ffffff] text-[#2FA4A9] shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                     <Activity className="w-5 h-5" />
                   </div>
                   <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-[#ffffff] border border-gray-100 p-4 rounded-2xl shadow-sm">
                      <div className="flex items-center justify-between space-x-2 mb-1">
                        <div className="font-bold text-[#1A1F2B] text-sm">{label}</div>
                        <time className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{format(log.createdAt, 'MMM d, h:mm a')}</time>
                      </div>
                      <div className="text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded-lg mt-2 break-all overflow-hidden line-clamp-2">
                        {log.details ? log.details : "No additional payload"}
                      </div>
                   </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
