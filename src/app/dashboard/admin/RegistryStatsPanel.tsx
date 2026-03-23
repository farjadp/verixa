import { Database, Mail, Phone, ShieldCheck } from "lucide-react";

export default function RegistryStatsPanel({ stats }: { stats: { total: number; active: number; withEmail: number; withPhone: number } }) {
  const formatPercent = (part: number, total: number) => {
    if (total === 0) return "0%";
    return Math.round((part / total) * 100) + "%";
  };

  return (
    <div className="bg-[#1A1A1A] border border-gray-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden group hover:border-gray-700 transition-all">
      <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full blur-3xl opacity-10 bg-blue-500 transition-opacity group-hover:opacity-20 pointer-events-none" />

      <h3 className="text-lg font-bold text-white mb-6 font-serif flex items-center gap-2 relative z-10">
        <Database className="w-5 h-5 text-blue-400" /> Real-time CICC Registry Status
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
        
        {/* Total Searched */}
        <div className="bg-gray-900/50 p-4 rounded-2xl border border-gray-800 flex flex-col items-center justify-center text-center">
          <p className="text-3xl font-black text-white font-serif">{stats.total.toLocaleString()}</p>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Total Scraped</p>
        </div>

        {/* Active Consultants */}
        <div className="bg-green-900/10 p-4 rounded-2xl border border-green-900/30 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1.5 justify-center mb-1">
            <ShieldCheck className="w-4 h-4 text-green-400" />
            <p className="text-3xl font-black text-green-400 font-serif">{stats.active.toLocaleString()}</p>
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Active Status</p>
          <p className="text-[10px] text-green-500/70 mt-0.5">{formatPercent(stats.active, stats.total)} of total</p>
        </div>

        {/* Has Email */}
        <div className="bg-blue-900/10 p-4 rounded-2xl border border-blue-900/30 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1.5 justify-center mb-1">
            <Mail className="w-4 h-4 text-blue-400" />
            <p className="text-3xl font-black text-blue-400 font-serif">{stats.withEmail.toLocaleString()}</p>
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Found Emails</p>
          <p className="text-[10px] text-blue-500/70 mt-0.5">{formatPercent(stats.withEmail, stats.total)} capture rate</p>
        </div>

        {/* Has Phone */}
        <div className="bg-purple-900/10 p-4 rounded-2xl border border-purple-900/30 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1.5 justify-center mb-1">
            <Phone className="w-4 h-4 text-purple-400" />
            <p className="text-3xl font-black text-purple-400 font-serif">{stats.withPhone.toLocaleString()}</p>
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Found Phones</p>
          <p className="text-[10px] text-purple-500/70 mt-0.5">{formatPercent(stats.withPhone, stats.total)} capture rate</p>
        </div>

      </div>
    </div>
  );
}
