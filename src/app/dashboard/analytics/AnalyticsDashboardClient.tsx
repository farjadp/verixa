"use client";

import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Cell,
} from "recharts";
import {
  Eye, MousePointerClick, CalendarCheck, DollarSign,
  TrendingUp, TrendingDown, Minus, Star, Zap, Target,
  ArrowUpRight, ArrowDownRight, Globe, Activity, Award,
  AlertTriangle, Users, BarChart2, ChevronRight
} from "lucide-react";
import type { ConsultantAnalytics, CompetitorInsight } from "@/lib/analytics";

interface Props {
  analytics: ConsultantAnalytics;
  competitor: CompetitorInsight;
  consultantName: string;
  days: number;
}

const PERIODS = [
  { label: "7 days",  value: "7" },
  { label: "30 days", value: "30" },
  { label: "90 days", value: "90" },
];

const SOURCE_COLORS: Record<string, string> = {
  Google:     "#4285F4",
  LinkedIn:   "#0A66C2",
  Telegram:   "#2AABEE",
  "Twitter/X":"#1DA1F2",
  Direct:     "#2FA4A9",
};

export default function AnalyticsDashboardClient({ analytics, competitor, consultantName, days }: Props) {
  const [period, setPeriod] = useState(String(days));

  // Currency formatter
  const fmtCAD = (cents: number) =>
    new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(cents / 100);

  const TrendIcon = analytics.trend === "up" ? TrendingUp : analytics.trend === "down" ? TrendingDown : Minus;
  const trendColor = analytics.trend === "up" ? "text-green-400" : analytics.trend === "down" ? "text-red-400" : "text-gray-400";

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#2FA4A9]/10 border border-[#2FA4A9]/20 text-[#2FA4A9] rounded-full text-[10px] font-bold uppercase tracking-widest mb-3">
            <Activity className="w-3.5 h-3.5" /> Analytics Dashboard
          </div>
          <h1 className="text-3xl font-serif font-black text-[#1A1F2B]">Your Performance</h1>
          <p className="text-gray-500 text-sm mt-1">Data-driven insights for {consultantName}</p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
          {PERIODS.map((p) => (
            <a
              key={p.value}
              href={`?period=${p.value}`}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                period === p.value
                  ? "bg-[#0F2A44] text-white shadow"
                  : "text-gray-500 hover:text-[#1A1F2B]"
              }`}
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </a>
          ))}
        </div>
      </div>

      {/* ── SECTION 1: OVERVIEW KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: "Profile Views",   value: analytics.profileViews,   icon: Eye,            color: "text-blue-400",   sub: analytics.trend !== "flat" ? `${analytics.trend === "up" ? "↑" : "↓"} trend` : "Stable" },
          { label: "Profile Clicks",  value: analytics.profileClicks,  icon: MousePointerClick, color: "text-purple-400", sub: "from views" },
          { label: "Booking Starts",  value: analytics.bookingStarts,  icon: CalendarCheck,  color: "text-yellow-400", sub: "high-intent" },
          { label: "Completed",       value: analytics.bookingsCompleted, icon: Award,        color: "text-green-400",  sub: "paid sessions" },
          { label: "Revenue",         value: fmtCAD(analytics.revenueCents), icon: DollarSign, color: "text-emerald-400", sub: `${days}d gross`, isString: true },
          { label: "Conversion",      value: `${analytics.conversionRate}%`, icon: Target,   color: "text-[#2FA4A9]",   sub: "views → booked", isString: true },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center ${kpi.color}`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
              </div>
              <div className="text-2xl font-black text-[#1A1F2B] mb-0.5">
                {kpi.isString ? kpi.value : kpi.value.toLocaleString()}
              </div>
              <div className="text-xs font-bold text-gray-500">{kpi.label}</div>
              <div className="text-[10px] text-gray-400 mt-1">{kpi.sub}</div>
            </div>
          );
        })}
      </div>

      {/* ── SECTION 2: FUNNEL + SPARKLINE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Funnel Chart */}
        <div className="lg:col-span-2 bg-[#0F2A44] border border-gray-800 rounded-3xl p-6 shadow-2xl">
          <h3 className="text-white font-serif font-bold text-lg mb-1">Performance Funnel</h3>
          <p className="text-gray-400 text-xs mb-6">Views → Clicks → Bookings → Paid</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={analytics.funnel} layout="vertical" margin={{ left: 8 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="stage" tick={{ fill: "#9CA3AF", fontSize: 11, fontWeight: 600 }} width={110} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#0F2A44", border: "1px solid #1f2937", borderRadius: 12, color: "#fff", fontSize: 12 }}
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
              />
              <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                {analytics.funnel.map((_, idx) => (
                  <Cell key={idx} fill={["#2FA4A9", "#3B82F6", "#8B5CF6", "#10B981"][idx]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Daily Views Sparkline */}
        <div className="lg:col-span-3 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-serif font-bold text-[#1A1F2B] text-lg">Profile Views Trend</h3>
            <div className={`flex items-center gap-1.5 text-sm font-bold ${trendColor}`}>
              <TrendIcon className="w-4 h-4" />
              {analytics.trend === "up" ? "Growing" : analytics.trend === "down" ? "Declining" : "Stable"}
            </div>
          </div>
          <p className="text-gray-400 text-xs mb-6">Daily views over the last {days} days</p>
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={analytics.dailyViews}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9CA3AF" }} tickFormatter={(v) => v.slice(5)} interval={Math.floor(analytics.dailyViews.length / 5)} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, fontSize: 12 }}
                formatter={(v) => [v, "Views"]}
              />
              <Line type="monotone" dataKey="views" stroke="#2FA4A9" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "#2FA4A9" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── SECTION 3: VISIBILITY + BOOKING ANALYTICS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Visibility Score */}
        <div className="bg-gradient-to-br from-[#0F2A44] to-[#1a3a5c] border border-gray-800 rounded-3xl p-6 shadow-2xl flex flex-col">
          <h3 className="text-white font-serif font-bold text-lg mb-1">Visibility Score</h3>
          <p className="text-gray-400 text-xs mb-6">Based on views, bookings &amp; reviews</p>
          
          {/* Big score */}
          <div className="flex-1 flex flex-col items-center justify-center py-4">
            <div className="relative w-36 h-36">
              {/* Circular progress SVG */}
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
                <circle
                  cx="60" cy="60" r="50"
                  fill="none"
                  stroke="#2FA4A9"
                  strokeWidth="12"
                  strokeDasharray={`${Math.min(analytics.visibilityScore / 5 * 3.14, 314)} 314`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-white">{Math.min(analytics.visibilityScore, 999)}</span>
                <span className="text-xs text-gray-400 font-bold mt-1">/ 500</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
              <div className="text-xl font-black text-white">{analytics.searchImpressions}</div>
              <div className="text-[10px] text-gray-400 font-bold mt-0.5">Impressions</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
              <div className={`text-xl font-black ${trendColor}`}>
                {analytics.trend === "up" ? "↑" : analytics.trend === "down" ? "↓" : "→"}
              </div>
              <div className="text-[10px] text-gray-400 font-bold mt-0.5">Trend</div>
            </div>
          </div>
        </div>

        {/* Booking Analytics */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
          <h3 className="font-serif font-bold text-[#1A1F2B] text-lg mb-1">Booking Analytics</h3>
          <p className="text-gray-400 text-xs mb-5">All-time booking quality</p>

          <div className="space-y-4">
            {[
              { label: "Acceptance Rate",   value: analytics.acceptanceRate,   color: "bg-green-400" },
              { label: "Cancellation Rate", value: analytics.cancellationRate, color: "bg-orange-400" },
              { label: "No-Show Rate",      value: analytics.noShowRate,       color: "bg-red-400" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-gray-600">{item.label}</span>
                  <span className="text-[#1A1F2B]">{item.value}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all duration-700`}
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-5 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Avg Booking Value</div>
                <div className="text-2xl font-black text-[#1A1F2B]">{fmtCAD(analytics.avgBookingValueCents)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Total Bookings</div>
                <div className="text-2xl font-black text-[#1A1F2B]">{analytics.totalBookings}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Panel */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
          <h3 className="font-serif font-bold text-[#1A1F2B] text-lg mb-1">Reviews &amp; Rating</h3>
          <p className="text-gray-400 text-xs mb-5">Client satisfaction summary</p>

          {/* Big rating */}
          <div className="flex flex-col items-center py-4">
            <div className="text-6xl font-black text-[#1A1F2B] mb-2">
              {analytics.avgRating > 0 ? analytics.avgRating.toFixed(1) : "—"}
            </div>
            <div className="flex items-center gap-0.5 mb-2">
              {[1,2,3,4,5].map((s) => (
                <Star
                  key={s}
                  className={`w-5 h-5 ${s <= Math.round(analytics.avgRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
                />
              ))}
            </div>
            <div className="text-sm font-bold text-gray-400">{analytics.totalReviews} total reviews</div>
          </div>

          <div className="mt-2 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-[#1A1F2B]">{analytics.totalReviews}</div>
              <div className="text-[10px] text-gray-400 font-bold mt-0.5">Total Reviews</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-[#2FA4A9]">
                {analytics.totalReviews > 0 ? `${Math.min(99, Math.round(analytics.totalReviews / Math.max(analytics.totalBookings, 1) * 100))}%` : "—"}
              </div>
              <div className="text-[10px] text-gray-400 font-bold mt-0.5">Review Rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 4: TRAFFIC SOURCES + COMPETITOR INSIGHT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Traffic Sources */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-5 h-5 text-gray-400" />
            <h3 className="font-serif font-bold text-[#1A1F2B] text-lg">Traffic Sources</h3>
          </div>
          <p className="text-gray-400 text-xs mb-6">Where your profile visitors come from</p>

          {analytics.trafficSources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <Globe className="w-10 h-10 mb-3 text-gray-200" />
              <p className="text-sm font-bold">No traffic data yet</p>
              <p className="text-xs mt-1">Share your profile to start tracking</p>
            </div>
          ) : (
            <div className="space-y-3">
              {analytics.trafficSources.map((src) => (
                <div key={src.source}>
                  <div className="flex justify-between text-sm font-bold mb-1.5">
                    <span className="text-gray-700">{src.source}</span>
                    <span className="text-[#1A1F2B]">{src.count} views ({src.pct}%)</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${src.pct}%`,
                        background: SOURCE_COLORS[src.source] ?? "#2FA4A9",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Competitor Insight */}
        <div className="bg-[#0F2A44] border border-gray-800 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center gap-2 mb-1">
            <BarChart2 className="w-5 h-5 text-[#2FA4A9]" />
            <h3 className="text-white font-serif font-bold text-lg">Competitor Insight</h3>
          </div>
          <p className="text-gray-400 text-xs mb-1">
            Your stats vs. peers in{" "}
            <span className="text-[#2FA4A9] font-bold">{competitor.specialization ?? "your specialization"}</span>
          </p>
          <p className="text-gray-500 text-[10px] mb-6">
            ⚠ Aggregate data only — PIPEDA compliant
          </p>

          <div className="space-y-4">
            {[
              { label: "Profile Views",     yours: competitor.yourViews,           avg: competitor.avgViews           },
              { label: "Bookings",          yours: competitor.yourBookings,        avg: competitor.avgBookings        },
              { label: "Avg Rating",        yours: competitor.yourRating,          avg: competitor.avgRating, isFloat: true },
              { label: "Visibility Score",  yours: competitor.yourVisibilityScore, avg: competitor.avgVisibilityScore },
            ].map((row) => {
              const isAhead = row.yours >= row.avg;
              const display = (v: number) => row.isFloat ? v.toFixed(1) : v.toLocaleString();
              return (
                <div key={row.label} className="flex items-center gap-4">
                  <div className="w-28 text-xs text-gray-400 font-bold">{row.label}</div>
                  <div className="flex-1">
                    <div className="flex justify-between text-[11px] font-bold mb-1">
                      <span className={isAhead ? "text-green-400" : "text-red-400"}>
                        You: {display(row.yours)}
                      </span>
                      <span className="text-gray-500">Avg: {display(row.avg)}</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isAhead ? "bg-green-400" : "bg-red-400"}`}
                        style={{
                          width: `${Math.min(row.avg > 0 ? (row.yours / Math.max(row.yours, row.avg)) * 100 : 50, 100)}%`
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    {isAhead
                      ? <ArrowUpRight className="w-4 h-4 text-green-400" />
                      : <ArrowDownRight className="w-4 h-4 text-red-400" />
                    }
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 text-[10px] text-gray-500">
            Compared against {competitor.totalPeers} peers in same specialization
          </div>
        </div>
      </div>

      {/* ── SECTION 5: HIGH INTENT + ACTION SUGGESTIONS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* High Intent Abandons */}
        <div className="bg-white border border-orange-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            <h3 className="font-serif font-bold text-[#1A1F2B] text-lg">High-Intent Leads</h3>
          </div>
          <p className="text-gray-400 text-xs mb-6">Users who started booking but abandoned</p>

          <div className="flex flex-col items-center justify-center py-6">
            <div className="text-6xl font-black text-orange-400 mb-2">{analytics.highIntentAbandons}</div>
            <div className="text-sm font-bold text-gray-500">abandoned at booking</div>
            <div className="text-xs text-gray-400 mt-1">in the last {days} days</div>
          </div>

          <div className="mt-4 p-4 bg-orange-50 rounded-2xl border border-orange-100">
            <p className="text-xs text-orange-700 font-bold">
              💡 These users showed strong intent. Consider optimizing your booking flow or pricing.
            </p>
          </div>
        </div>

        {/* Action Suggestions */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-5 h-5 text-[#2FA4A9]" />
            <h3 className="font-serif font-bold text-[#1A1F2B] text-lg">Growth Suggestions</h3>
          </div>
          <p className="text-gray-400 text-xs mb-6">Personalized actions to improve your profile</p>

          {analytics.suggestions.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-gray-400">
              <Award className="w-10 h-10 mb-3 text-green-300" />
              <p className="font-bold text-[#1A1F2B]">You're on top of everything!</p>
              <p className="text-sm mt-1">No actions needed right now.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {analytics.suggestions.map((s, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-4 p-4 rounded-2xl border ${
                    s.impact === "high"   ? "bg-red-50 border-red-100"    :
                    s.impact === "medium" ? "bg-yellow-50 border-yellow-100" :
                    "bg-blue-50 border-blue-100"
                  }`}
                >
                  <div className="text-2xl shrink-0 mt-0.5">{s.icon}</div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-[#1A1F2B] mb-0.5">{s.message}</p>
                    <a
                      href={s.ctaHref}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#2FA4A9] hover:underline"
                    >
                      {s.cta} <ChevronRight className="w-3 h-3" />
                    </a>
                  </div>
                  <div className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                    s.impact === "high"   ? "bg-red-100 text-red-600"    :
                    s.impact === "medium" ? "bg-yellow-100 text-yellow-700" :
                    "bg-blue-100 text-blue-600"
                  }`}>
                    {s.impact}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
