import { prisma } from "@/lib/prisma";
import AdminDashboardStats from "./AdminDashboardStats";
import AdminDashboardCharts from "./AdminDashboardCharts";
import RegistryStatsPanel from "./RegistryStatsPanel";
import ActionableQueues from "./ActionableQueues";
import { getRegistryStats } from "@/lib/db";
import { getPlatformAnalytics } from "@/lib/analytics";
import { format } from "date-fns";
import { ShieldAlert, Activity, Users, ShieldCheck, ChevronRight, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default async function AdminHome() {
  let totalClients = 0;
  let totalConsultants = 0;
  let totalBookings = 0;
  let recentLogs: any[] = [];
  let platformAnalytics: Awaited<ReturnType<typeof getPlatformAnalytics>>;

  try {
    [
      totalClients,
      totalConsultants,
      totalBookings,
      ,
      recentLogs,
      ,
      platformAnalytics,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "CLIENT" } }).catch(() => 0),
      prisma.consultantProfile.count().catch(() => 0),
      prisma.booking.count().catch(() => 0),
      prisma.systemLog.count().catch(() => 0),
      prisma.systemLog.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { user: true }
      }).catch(() => []),
      prisma.consultantProfile.findMany({
        take: 5,
        orderBy: { createdAt: "desc" }
      }).catch(() => []),
      getPlatformAnalytics(30),
    ]);
  } catch (e) {
    console.error("AdminHome data fetch error:", e);
  }

  platformAnalytics ??= {
    totalUsers: 0, totalConsultants: 0, activeConsultants: 0,
    totalBookings: 0, totalRevenueCents: 0, conversionRate: 0,
    churnRate: 0, topArticles: [], highIntentAbandons: 0,
    demandByProvince: [], revenueBySource: [], dailyBookings: [],
  };

  const registryStats = await getRegistryStats().catch(() => ({ total: 0, active: 0, withEmail: 0, withPhone: 0 }));

  // Real revenue from Stripe captured payments
  const platformRevenue = Math.round((platformAnalytics.totalRevenueCents ?? 0) / 100);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
        <div>
           <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full text-[10px] font-bold uppercase tracking-widest mb-3">
             <ShieldAlert className="w-3.5 h-3.5" /> Superadmin
           </div>
           <h1 className="text-4xl font-serif font-black text-white tracking-tight">Command Center</h1>
           <p className="text-gray-400 mt-2 font-light">Global platform oversight, real-time metrics, and security controls.</p>
        </div>
        <div className="flex gap-3">
           <Link href="/dashboard/admin/logs" className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-white transition-all backdrop-blur-md">
             View All Logs
           </Link>
        </div>
      </div>

      {/* KPI Stats (Bento Top Row) */}
      <AdminDashboardStats 
        clients={totalClients} 
        consultants={totalConsultants} 
        bookings={totalBookings} 
        revenue={platformRevenue}
      />

      <RegistryStatsPanel stats={registryStats} />

      {/* Actionable Pipeline (Fires) */}
      <ActionableQueues />

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         
         {/* Charts - 2 spans */}
         <div className="lg:col-span-2 bg-[#0F2A44] border border-gray-800 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-6 font-serif">Platform Growth & Activity</h3>
            <div className="h-[300px] w-full">
              <AdminDashboardCharts totalClients={totalClients} totalConsultants={totalConsultants} />
            </div>
         </div>

         {/* Recent System Activity */}
         <div className="bg-[#0F2A44] border border-gray-800 rounded-3xl p-6 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white font-serif">Live Security Feed</h3>
              <Activity className="w-5 h-5 text-green-400 animate-pulse" />
            </div>
            
            <div className="flex-1 space-y-4 overflow-y-auto pr-2">
              {recentLogs.map((log) => (
                <div key={log.id} className="group relative pl-4 border-l-2 border-white/10 hover:border-green-400/50 transition-colors">
                   <div className="absolute -left-1.5 top-1.5 w-2.5 h-2.5 rounded-full bg-white/10 group-hover:bg-green-400 transition-colors border-2 border-[#0F2A44]" />
                   <div className="flex justify-between items-start mb-1">
                     <span className="text-[10px] font-bold text-green-400/80 font-mono uppercase tracking-wider">{log.action}</span>
                     <span className="text-[10px] text-gray-500 uppercase tracking-widest">{format(new Date(log.createdAt), 'HH:mm:ss')}</span>
                   </div>
                   <p className="text-xs text-gray-300 truncate">{log.user?.email || "SYSTEM"}</p>
                </div>
              ))}
            </div>

            <Link href="/dashboard/admin/logs" className="mt-6 flex items-center justify-center gap-2 w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-white transition-all uppercase tracking-widest border border-white/5">
              Open Full Logs <ChevronRight className="w-3.5 h-3.5" />
            </Link>
         </div>
      </div>

    </div>
  );
}
