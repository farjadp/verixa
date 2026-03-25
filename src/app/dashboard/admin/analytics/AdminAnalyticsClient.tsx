"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Cell,
} from "recharts";
import {
  Users, DollarSign, CalendarCheck, TrendingUp, TrendingDown,
  Activity, AlertTriangle, FileText, Globe, Star, ChevronRight,
  ShieldCheck, ShieldAlert
} from "lucide-react";
import type { PlatformAnalytics } from "@/lib/analytics";
import Link from "next/link";

interface ConsultantRow {
  id: string;
  fullName: string;
  province: string | null;
  totalBookings: number;
  completedBookings: number;
  revenueCents: number;
  avgRating: number;
  reviewCount: number;
  isClaimed: boolean;
}

interface Props {
  platform: PlatformAnalytics;
  consultantRows: ConsultantRow[];
  days: number;
}

const PERIODS = [
  { label: "7 days",  value: "7" },
  { label: "30 days", value: "30" },
  { label: "90 days", value: "90" },
];

export default function AdminAnalyticsClient({ platform, consultantRows, days }: Props) {
  const fmtCAD = (cents: number) =>
    new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(cents / 100);

  const period = String(days);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full text-[10px] font-bold uppercase tracking-widest mb-3">
            <ShieldAlert className="w-3.5 h-3.5" /> Admin Analytics
          </div>
          <h1 className="text-4xl font-serif font-black text-white">Platform Intelligence</h1>
          <p className="text-gray-400 mt-2">Full-access analytics — visible to Superadmin only</p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
          {PERIODS.map((p) => (
            <a
              key={p.value}
              href={`?period=${p.value}`}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                period === p.value
                  ? "bg-white/10 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {p.label}
            </a>
          ))}
        </div>
      </div>

      {/* ── PLATFORM KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Clients",       value: platform.totalUsers,         icon: Users,         color: "text-blue-400",   sub: "registered users" },
          { label: "Total Consultants",   value: platform.totalConsultants,   icon: ShieldCheck,   color: "text-green-400",  sub: `${platform.activeConsultants} active (${days}d)` },
          { label: "Total Bookings",      value: platform.totalBookings,      icon: CalendarCheck, color: "text-purple-400", sub: "all time" },
          { label: "Platform Revenue",    value: fmtCAD(platform.totalRevenueCents), icon: DollarSign, color: "text-emerald-400", sub: "captured payments", isString: true },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className="bg-[#0F2A44] border border-gray-800 rounded-2xl p-5 shadow-xl">
              <div className={`w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center mb-4 ${kpi.color}`}>
                <Icon className="w-4.5 h-4.5" />
              </div>
              <div className="text-2xl font-black text-white mb-0.5">
                {kpi.isString ? kpi.value : (kpi.value as number).toLocaleString()}
              </div>
              <div className="text-xs font-bold text-gray-400">{kpi.label}</div>
              <div className="text-[10px] text-gray-600 mt-1">{kpi.sub}</div>
            </div>
          );
        })}
      </div>

      {/* ── SECONDARY KPIs ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0F2A44] border border-gray-800 rounded-2xl p-5 shadow-xl">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Platform Conversion</div>
          <div className="text-4xl font-black text-[#2FA4A9]">{platform.conversionRate}%</div>
          <div className="text-xs text-gray-500 mt-1">booking_started → booking_completed</div>
        </div>
        <div className="bg-[#0F2A44] border border-gray-800 rounded-2xl p-5 shadow-xl">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Consultant Churn</div>
          <div className={`text-4xl font-black ${platform.churnRate > 30 ? "text-red-400" : "text-yellow-400"}`}>
            {platform.churnRate}%
          </div>
          <div className="text-xs text-gray-500 mt-1">consultants with no bookings in {days}d</div>
        </div>
        <div className="bg-orange-900/30 border border-orange-700/30 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            <div className="text-xs font-bold text-orange-400 uppercase tracking-wider">High-Intent Abandons</div>
          </div>
          <div className="text-4xl font-black text-orange-400">{platform.highIntentAbandons}</div>
          <div className="text-xs text-orange-600 mt-1">users who started booking but did not pay</div>
        </div>
      </div>

      {/* ── DAILY BOOKINGS + TOP DEMAND ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Daily Bookings Trend */}
        <div className="lg:col-span-2 bg-[#0F2A44] border border-gray-800 rounded-3xl p-6 shadow-2xl">
          <h3 className="text-white font-serif font-bold text-lg mb-1">Daily Booking Volume</h3>
          <p className="text-gray-400 text-xs mb-5">Platform-wide bookings over last {days} days</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={platform.dailyBookings}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6B7280" }}
                tickFormatter={(v) => v.slice(5)} interval={Math.floor(platform.dailyBookings.length / 6)}
                axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#0F2A44", border: "1px solid #1f2937", borderRadius: 12, color: "#fff", fontSize: 12 }}
                formatter={(v) => [v, "Bookings"]}
              />
              <Line type="monotone" dataKey="count" stroke="#2FA4A9" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: "#2FA4A9" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Market Demand by Province */}
        <div className="bg-[#0F2A44] border border-gray-800 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-4 h-4 text-[#2FA4A9]" />
            <h3 className="text-white font-serif font-bold text-lg">Market Demand</h3>
          </div>
          <p className="text-gray-400 text-xs mb-5">Search volume by province ({days}d)</p>

          {platform.demandByProvince.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-gray-500">
              <Globe className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No search data yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {platform.demandByProvince.slice(0, 7).map((d, i) => {
                const maxCount = platform.demandByProvince[0]?.count ?? 1;
                return (
                  <div key={d.province}>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-gray-300">{d.province}</span>
                      <span className="text-[#2FA4A9]">{d.count} searches</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-[#2FA4A9] rounded-full" style={{ width: `${(d.count / maxCount) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── TOP ARTICLES ── */}
      {platform.topArticles.length > 0 && (
        <div className="bg-[#0F2A44] border border-gray-800 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#2FA4A9]" />
              <h3 className="text-white font-serif font-bold text-lg">Top Articles by Traffic</h3>
            </div>
            <Link href="/dashboard/admin/blog" className="text-xs font-bold text-[#2FA4A9] hover:underline flex items-center gap-1">
              View All <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-[10px] text-gray-500 font-bold uppercase tracking-wider py-2 pr-4">Article</th>
                  <th className="text-right text-[10px] text-gray-500 font-bold uppercase tracking-wider py-2">Views ({days}d)</th>
                </tr>
              </thead>
              <tbody>
                {platform.topArticles.map((a) => (
                  <tr key={a.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="py-3 pr-4 text-gray-300 font-medium truncate max-w-[400px]">{a.title}</td>
                    <td className="py-3 text-right font-black text-[#2FA4A9]">{a.views.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CONSULTANT LEADERBOARD ── */}
      <div className="bg-[#0F2A44] border border-gray-800 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#2FA4A9]" />
            <h3 className="text-white font-serif font-bold text-lg">Consultant Performance</h3>
          </div>
          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Sorted by Revenue</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {["Consultant", "Province", "Bookings", "Completed", "Revenue", "Avg Rating", "Reviews", "Status"].map(h => (
                  <th key={h} className="text-left text-[10px] text-gray-500 font-bold uppercase tracking-wider py-2 pr-4 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {consultantRows.map((c, i) => (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/3 transition-colors group">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-600 font-mono w-5">{i + 1}</span>
                      <span className="text-gray-200 font-bold truncate max-w-[160px]">{c.fullName}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-gray-400 text-xs">{c.province || "—"}</td>
                  <td className="py-3 pr-4 text-gray-300 font-bold">{c.totalBookings}</td>
                  <td className="py-3 pr-4 text-green-400 font-bold">{c.completedBookings}</td>
                  <td className="py-3 pr-4 font-black text-emerald-400">{fmtCAD(c.revenueCents)}</td>
                  <td className="py-3 pr-4">
                    {c.avgRating > 0 ? (
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-yellow-400 font-bold">{c.avgRating}</span>
                      </div>
                    ) : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="py-3 pr-4 text-gray-400 text-xs">{c.reviewCount}</td>
                  <td className="py-3">
                    {c.isClaimed
                      ? <span className="px-2 py-1 bg-green-400/10 text-green-400 rounded-lg text-[10px] font-bold">Claimed</span>
                      : <span className="px-2 py-1 bg-gray-400/10 text-gray-500 rounded-lg text-[10px] font-bold">Unclaimed</span>
                    }
                  </td>
                </tr>
              ))}
              {consultantRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">No consultant data yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
