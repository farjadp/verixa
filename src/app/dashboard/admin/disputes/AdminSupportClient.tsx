"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { replyToTicket, updateTicketStatus, getTicketDetails } from "@/actions/support.actions";
import { MessageSquare, Send, CheckCircle, AlertCircle, Clock, ShieldAlert, User } from "lucide-react";

type Ticket = {
  id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  updatedAt: Date;
  user: { name: string; email: string; role: string };
  messages: any[];
};

export default function AdminSupportClient({ 
  initialTickets, 
  adminId 
}: { 
  initialTickets: any[];
  adminId: string;
}) {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [activeTicket, setActiveTicket] = useState<any | null>(null);
  
  // Reply state
  const [replyContent, setReplyContent] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [replying, setReplying] = useState(false);
  const [loadingTicket, setLoadingTicket] = useState(false);

  // Status state
  const [updating, setUpdating] = useState(false);

  const loadFullTicket = async (ticketId: string) => {
    setLoadingTicket(true);
    const details = await getTicketDetails(ticketId, true); // true = isAdmin, loads internal notes
    setActiveTicket(details);
    setLoadingTicket(false);
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent || !activeTicket) return;
    setReplying(true);

    const res = await replyToTicket({
      ticketId: activeTicket.id,
      senderId: adminId,
      content: replyContent,
      isInternal
    });

    if (res.success) {
      setReplyContent("");
      setIsInternal(false);
      await loadFullTicket(activeTicket.id); // reload thread
      router.refresh(); // reload sidebar
    }
    setReplying(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!activeTicket) return;
    setUpdating(true);
    const res = await updateTicketStatus(activeTicket.id, newStatus, adminId);
    if (res.success) {
      await loadFullTicket(activeTicket.id);
      router.refresh();
    }
    setUpdating(false);
  };

  return (
    <>
      {/* Left Sidebar - Ticket List */}
      <div className="w-80 border-r border-gray-800 bg-[#111] flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-gray-800">
          <input 
            type="text"
            placeholder="Search tickets..."
            className="w-full bg-[#222] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {tickets.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
              Inbox zero! No active tickets.
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {tickets.map(t => (
                <button
                  key={t.id}
                  onClick={() => loadFullTicket(t.id)}
                  className={`w-full text-left p-4 hover:bg-[#222] transition-colors block border-l-4 ${
                    activeTicket?.id === t.id ? "border-blue-500 bg-[#222]" : "border-transparent"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-semibold text-gray-200 text-sm truncate pr-2">{t.subject}</h3>
                    <span className="text-[10px] text-gray-500 shrink-0">
                      {formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-400 truncate flex items-center gap-1">
                      <User className="w-3 h-3" /> {t.user.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      t.status === "OPEN" ? "bg-amber-500/10 text-amber-500" :
                      t.status === "IN_PROGRESS" ? "bg-blue-500/10 text-blue-500" :
                      "bg-green-500/10 text-green-500"
                    }`}>
                      {t.status}
                    </span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">{t.category}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col h-full bg-[#1A1A1A] relative">
        {loadingTicket ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="animate-spin w-8 h-8 border-4 border-gray-600 border-t-white rounded-full"></div>
          </div>
        ) : activeTicket ? (
          <>
            {/* View Ticket Thread Header */}
            <div className="px-8 py-5 border-b border-gray-800 shrink-0 bg-[#111] z-10 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white mb-2">{activeTicket.subject}</h2>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1.5"><User className="w-3 h-3" /> {activeTicket.user.name} ({activeTicket.user.email})</span>
                  <span className="flex items-center gap-1.5"><AlertCircle className="w-3 h-3" /> {activeTicket.category}</span>
                  <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Updated {formatDistanceToNow(new Date(activeTicket.updatedAt))} ago</span>
                </div>
              </div>

              {/* Status Controls */}
              <div className="flex items-center gap-2">
                <select 
                  value={activeTicket.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={updating}
                  className="bg-[#222] border border-gray-700 text-sm text-white rounded-lg px-3 py-1.5 outline-none focus:border-gray-500"
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {activeTicket.messages.map((msg: any) => {
                const isAdmin = msg.sender.role === "ADMIN";
                return (
                  <div key={msg.id} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className={`text-sm font-medium ${isAdmin ? 'text-blue-400' : 'text-gray-300'}`}>
                        {msg.sender.name} {msg.isInternal && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded ml-1">INTERNAL NOTE</span>}
                      </span>
                      <span className="text-[11px] text-gray-500">{formatDistanceToNow(new Date(msg.createdAt))} ago</span>
                    </div>
                    <div className={`p-4 rounded-xl max-w-[80%] whitespace-pre-wrap text-sm ${
                      msg.isInternal
                        ? 'bg-red-950/30 border border-red-900/50 text-red-200'
                        : isAdmin 
                          ? 'bg-blue-900/20 border border-blue-800 text-blue-100 rounded-tr-sm' 
                          : 'bg-[#222] border border-gray-800 text-gray-300 rounded-tl-sm shadow-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply Input */}
            <div className="p-4 border-t border-gray-800 bg-[#111] shrink-0">
              <form onSubmit={handleReply} className="flex flex-col gap-3">
                <textarea 
                  value={replyContent}
                  onChange={e => setReplyContent(e.target.value)}
                  placeholder="Type your response to the user..."
                  rows={3}
                  className="w-full bg-[#222] border border-gray-700 rounded-lg p-3 text-sm text-white outline-none focus:border-gray-500 resize-none"
                  required
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isInternal}
                      onChange={e => setIsInternal(e.target.checked)}
                      className="rounded border-gray-700 bg-[#222] text-blue-500 focus:ring-0 focus:ring-offset-0"
                    />
                    <ShieldAlert className="w-4 h-4 text-red-500" />
                    Internal Note (Invisible to user)
                  </label>
                  <button 
                    type="submit" 
                    disabled={replying}
                    className={`px-6 py-2 text-white font-medium rounded-lg transition-colors flex items-center gap-2 ${
                      isInternal ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                    } disabled:opacity-50`}
                  >
                    {replying ? "Sending..." : <><Send className="w-4 h-4" /> {isInternal ? 'Add Note' : 'Send Reply'}</>}
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
            <p>Select a ticket from the queue</p>
          </div>
        )}
      </div>
    </>
  );
}
