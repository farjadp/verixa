"use client";

import { Users, Briefcase, CalendarDays, DollarSign } from "lucide-react";

export default function AdminDashboardStats({ 
  clients, 
  consultants, 
  bookings, 
  revenue 
}: { 
  clients: number, 
  consultants: number, 
  bookings: number, 
  revenue: number 
}) {
  const stats = [
    { title: "Total Clients", value: clients.toLocaleString(), icon: Users, trend: "+12%", color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
    { title: "Registered Consultants", value: consultants.toLocaleString(), icon: Briefcase, trend: "+5%", color: "text-[#2FA4A9]", bg: "bg-[#2FA4A9]/10", border: "border-[#2FA4A9]/20" },
    { title: "Platform Bookings", value: bookings.toLocaleString(), icon: CalendarDays, trend: "+24%", color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20" },
    { title: "Gross Platform Rev", value: `$${revenue.toLocaleString()}`, icon: DollarSign, trend: "+18%", color: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/20" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <div key={i} className="bg-[#0F2A44] border border-gray-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden group hover:border-gray-700 transition-all">
             <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-3xl opacity-20 bg-current transition-opacity group-hover:opacity-40" style={{ color: "var(--tw-text-opacity)" }} />
             
             <div className="flex justify-between items-start mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${stat.bg} ${stat.border} ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">{stat.trend}</span>
             </div>
             
             <div>
               <p className="text-3xl font-black text-white font-serif tracking-tight">{stat.value}</p>
               <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{stat.title}</p>
             </div>
          </div>
        );
      })}
    </div>
  );
}
