"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { ShieldAlert, User, Briefcase, Activity, ChevronDown, ChevronRight } from "lucide-react";

export default function AdminLogsTable({ initialLogs }: { initialLogs: any[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState("ALL");

  const filteredLogs = initialLogs.filter(log => {
    if (filterRole === "ALL") return true;
    return log.role === filterRole;
  });

  const getRoleIcon = (role: string | null) => {
    switch (role) {
      case "ADMIN": return <ShieldAlert className="w-4 h-4 text-red-500" />;
      case "CONSULTANT": return <Briefcase className="w-4 h-4 text-[#2FA4A9]" />;
      case "CLIENT": return <User className="w-4 h-4 text-blue-500" />;
      default: return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const getRoleColor = (role: string | null) => {
    switch (role) {
      case "ADMIN": return "bg-red-50 text-red-600 border-red-100";
      case "CONSULTANT": return "bg-[#ffffff] text-[#2FA4A9] border-[#e5e7eb]";
      case "CLIENT": return "bg-blue-50 text-blue-600 border-blue-100";
      default: return "bg-gray-50 text-gray-500 border-gray-200";
    }
  };

  return (
    <div className="w-full">
      {/* FILTER BAR */}
      <div className="px-6 py-4 border-b border-[#e5e7eb] bg-[#ffffff] gap-2 flex items-center">
         <span className="text-xs font-bold uppercase tracking-wider text-gray-400 mr-2">Filter Role:</span>
         {["ALL", "ADMIN", "CONSULTANT", "CLIENT"].map(r => (
           <button 
             key={r}
             onClick={() => setFilterRole(r)}
             className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${filterRole === r ? 'bg-[#0F2A44] text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
           >
             {r}
           </button>
         ))}
      </div>

      <div className="overflow-x-auto min-h-[500px]">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="bg-[#ffffff]">
            <tr className="border-b border-[#e5e7eb]">
              <th className="py-4 pl-6 pr-4 text-xs font-bold uppercase tracking-wider text-gray-400">Timestamp</th>
              <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-400">Actor / Email</th>
              <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-400">Role</th>
              <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-400">Action</th>
              <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-400">IP Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredLogs.length === 0 ? (
              <tr><td colSpan={5} className="py-12 text-center text-gray-400 text-sm">No logs found matching this filter.</td></tr>
            ) : filteredLogs.map((log) => {
              const dateVal = log.createdAt ? new Date(log.createdAt) : new Date();
              return (
              <React.Fragment key={log.id}>
                <tr 
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                >
                  <td className="py-4 pl-6 pr-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button className="text-gray-300 group-hover:text-[#1A1F2B] transition-colors">
                        {expandedId === log.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <div>
                        <p className="text-sm font-bold text-[#1A1F2B]">{format(dateVal, 'MMM d, yyyy')}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">{format(dateVal, 'h:mm:ss a')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <p className="text-sm font-bold text-[#1A1F2B]">{log.user?.email || "SYSTEM_OR_GUEST"}</p>
                    {log.user?.name && <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">{log.user.name}</p>}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex flex-row items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest border rounded-[6px] ${getRoleColor(log.role)}`}>
                      {getRoleIcon(log.role)} {log.role || "SYSTEM"}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-xs font-bold font-mono bg-gray-100 text-[#1A1F2B] px-2 py-1 rounded">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <p className="text-xs text-gray-500 font-mono">{log.ipAddress || "N/A"}</p>
                  </td>
                </tr>
                {expandedId === log.id && (
                  <tr className="bg-gray-50 border-t-0 shadow-inner">
                    <td colSpan={5} className="p-6 pl-14">
                       <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Payload Details</h4>
                       <pre className="bg-[#0F2A44] text-green-400 p-4 rounded-xl text-xs overflow-x-auto font-mono whitespace-pre-wrap">
                         {log.details ? JSON.stringify(JSON.parse(log.details), null, 2) : "No details available."}
                       </pre>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )})}
          </tbody>
        </table>
      </div>
    </div>
  );
}
