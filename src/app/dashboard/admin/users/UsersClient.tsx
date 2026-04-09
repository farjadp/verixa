"use client";

import { useState } from "react";
import { Search, ShieldAlert, UserX, Activity, Mail, UserPlus, Edit3, Trash2 } from "lucide-react";
import { format } from "date-fns";
import UserModal from "./UserModal";
import { deleteUser } from "@/actions/users.actions";

export default function UsersClient({ initialUsers }: { initialUsers: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<any>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Filter Logic
  const filteredUsers = initialUsers.filter(u => {
    const matchesSearch = 
      (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const handleAddClick = () => {
    setUserToEdit(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (user: any) => {
    setUserToEdit(user);
    setIsModalOpen(true);
  };

  const handleDelete = async (user: any) => {
    if (!confirm(`Are you absolutely sure you want to delete ${user.email}?\nThis action cannot be undone.`)) return;
    
    setLoadingId(user.id);
    try {
      await deleteUser(user.id);
    } catch (e: any) {
      alert(e.message || "Failed to delete user.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#0F2A44] p-6 rounded-2xl border border-gray-800 shadow-xl">
        <div className="flex bg-black/30 p-1 rounded-xl">
          {["ALL", "CLIENT", "CONSULTANT", "ADMIN"].map(r => (
            <button 
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${roleFilter === r ? "bg-[#2FA4A9] text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
            >
              {r === "ALL" ? "All Users" : r + "S"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search User or Email..." 
              className="w-full pl-9 pr-4 py-2.5 bg-black/20 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-[#2FA4A9]"
            />
          </div>
          <button 
            onClick={handleAddClick}
            className="flex items-center gap-2 bg-white text-[#0F2A44] px-5 py-2.5 rounded-xl font-bold text-sm tracking-wide shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all"
          >
            <UserPlus className="w-4 h-4" /> Provision
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-[#0F2A44] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-black/40 text-gray-400 text-xs uppercase tracking-widest border-b border-gray-800">
              <tr>
                <th className="px-6 py-5 font-bold">Identity & Role</th>
                <th className="px-6 py-5 font-bold">Registration Date</th>
                <th className="px-6 py-5 font-bold">Platform Footprint</th>
                <th className="px-6 py-5 font-bold">Recent Pulse</th>
                <th className="px-6 py-5 font-bold text-center">Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50 text-gray-300">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${u.role === 'ADMIN' ? 'bg-red-500/20 text-red-400' : u.role === 'CONSULTANT' ? 'bg-amber-500/20 text-amber-400' : 'bg-[#2FA4A9]/20 text-[#2FA4A9]'}`}>
                        {u.name ? u.name.charAt(0).toUpperCase() : u.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                           {u.name || "System Identity"}
                           {u.role === 'ADMIN' && <span className="text-[9px] uppercase tracking-wider bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded border border-red-500/20">Root</span>}
                           {u.role === 'CONSULTANT' && <span className="text-[9px] uppercase tracking-wider bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20">RCIC</span>}
                        </div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5 font-mono">
                          <Mail className="w-3 h-3 text-[#2FA4A9]/50" /> {u.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {format(new Date(u.createdAt), "MMM d, yyyy")}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4 text-[11px] text-gray-500">
                      <div className="text-center bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                        <div className="text-white font-bold text-sm">{u._count.savedProfiles || 0}</div>
                        <div>Saves</div>
                      </div>
                      <div className="text-center bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                        <div className="text-white font-bold text-sm">{u._count.reviews || 0}</div>
                        <div>Reviews</div>
                      </div>
                      <div className="text-center bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                        <div className="text-[#2FA4A9] font-bold text-sm">{u._count.blogPosts || 0}</div>
                        <div>Articles</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {u.systemLogs?.length > 0 ? (
                       <span className="flex items-center gap-1.5 bg-[#2FA4A9]/10 text-[#2FA4A9] w-max px-3 py-1.5 rounded-full border border-[#2FA4A9]/20" title={u.systemLogs[0].action}>
                         <Activity className="w-3.5 h-3.5" /> 
                         {format(new Date(u.systemLogs[0].createdAt), "MMM d HH:mm")}
                       </span>
                    ) : (
                       <span className="text-gray-600 italic">No heartbeat recorded</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => handleEditClick(u)} className="p-2 bg-white/5 hover:bg-white text-gray-400 hover:text-black rounded-lg transition-colors border border-white/5" title="Edit Identity">
                         <Edit3 className="w-4 h-4" />
                       </button>
                       <button onClick={() => handleDelete(u)} disabled={loadingId === u.id} className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-colors border border-red-500/20 disabled:opacity-50" title="Terminate Identity">
                         {loadingId === u.id ? <Activity className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
              
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-gray-500">
                    <UserX className="w-12 h-12 mx-auto mb-3 text-gray-700" />
                    <p className="font-medium text-lg text-white">No identities found</p>
                    <p className="text-sm">Adjust your filters or provision a new user.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <UserModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        userToEdit={userToEdit}
        onSuccess={() => { /* revalidatePath handles refresh remotely */ }} 
      />

    </div>
  );
}
