"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { createTicket, replyToTicket } from "@/actions/support.actions";
import { MessageSquare, Plus, Send, AlertCircle, CheckCircle, Clock } from "lucide-react";

type Ticket = {
  id: string;
  subject: string;
  category: string;
  status: string;
  updatedAt: Date;
  messages: any[];
};

export default function SupportTicketClient({ 
  initialTickets, 
  userId 
}: { 
  initialTickets: any[];
  userId: string;
}) {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(initialTickets[0]?.id || null);
  
  // New ticket state
  const [isCreating, setIsCreating] = useState(initialTickets.length === 0);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("General Inquiry");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reply state
  const [replyContent, setReplyContent] = useState("");
  const [replying, setReplying] = useState(false);

  const activeTicket = tickets.find(t => t.id === activeTicketId);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) return;
    setSubmitting(true);

    const res = await createTicket({
      userId,
      subject,
      category,
      priority: "NORMAL",
      message: message
    });

    if (res.success && res.ticketId) {
      setSubject("");
      setMessage("");
      setIsCreating(false);
      setActiveTicketId(res.ticketId);
      router.refresh(); 
      // Instead of waiting for refresh propogation, just reload page to get full ticket tree simply
      window.location.reload();
    }
    setSubmitting(false);
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent || !activeTicketId) return;
    setReplying(true);

    const res = await replyToTicket({
      ticketId: activeTicketId,
      senderId: userId,
      content: replyContent
    });

    if (res.success) {
      setReplyContent("");
      router.refresh();
      window.location.reload();
    }
    setReplying(false);
  };

  return (
    <>
      {/* Left Sidebar - Ticket List */}
      <div className="w-80 border-r border-gray-200 bg-gray-50 flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-gray-200">
          <button 
            onClick={() => setIsCreating(true)}
            className="w-full py-2.5 bg-[#0B2136] hover:bg-[#14314c] text-white rounded-lg flex items-center justify-center gap-2 font-medium text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Ticket
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {tickets.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
              No tickets found.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {tickets.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setIsCreating(false); setActiveTicketId(t.id); }}
                  className={`w-full text-left p-4 hover:bg-white transition-colors block border-l-4 ${
                    activeTicketId === t.id && !isCreating ? "border-[#0B2136] bg-white" : "border-transparent"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-semibold text-gray-900 text-sm truncate pr-2">{t.subject}</h3>
                    <span className="text-[10px] text-gray-400 shrink-0">
                      {formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${
                      t.status === "OPEN" ? "bg-amber-100 text-amber-700" :
                      t.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
                      "bg-green-100 text-green-700"
                    }`}>
                      {t.status}
                    </span>
                    <span className="text-gray-500 truncate">{t.category}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col h-full bg-white relative">
        {isCreating ? (
          <div className="p-8 max-w-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Ticket</h2>
            <form onSubmit={handleCreateTicket} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select 
                  value={category} 
                  onChange={e => setCategory(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-[#0B2136]"
                >
                  <option>General Inquiry</option>
                  <option>Billing & Payments</option>
                  <option>Technical Issue</option>
                  <option>Report / Dispute</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input 
                  type="text" 
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Brief summary of your issue"
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-[#0B2136]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Detailed Message</label>
                <textarea 
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Please provide as much detail as possible..."
                  rows={6}
                  className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-[#0B2136] resize-none"
                  required
                />
              </div>
              <button 
                type="submit" 
                disabled={submitting}
                className="px-6 py-2.5 bg-[#0B2136] text-white font-medium rounded-lg hover:bg-[#14314c] transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? "Submitting..." : <><Send className="w-4 h-4" /> Submit Ticket</>}
              </button>
            </form>
          </div>
        ) : activeTicket ? (
          <>
            {/* View Ticket Thread */}
            <div className="px-8 py-6 border-b border-gray-200 shrink-0 bg-white z-10">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-gray-900">{activeTicket.subject}</h2>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span className="flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> {activeTicket.category}</span>
                <span>•</span>
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> Updated {formatDistanceToNow(new Date(activeTicket.updatedAt))} ago</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-gray-50/50">
              {activeTicket.messages.map((msg: any) => {
                const isMe = msg.senderId === userId;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">{isMe ? "You" : "Verixa Support"}</span>
                      <span className="text-xs text-gray-400">{formatDistanceToNow(new Date(msg.createdAt))} ago</span>
                    </div>
                    <div className={`p-4 rounded-2xl max-w-[80%] whitespace-pre-wrap ${
                      isMe 
                        ? 'bg-[#0B2136] text-white rounded-tr-sm' 
                        : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply Input */}
            {activeTicket.status !== "RESOLVED" && activeTicket.status !== "CLOSED" ? (
              <div className="p-4 border-t border-gray-200 bg-white shrink-0">
                <form onSubmit={handleReply} className="flex gap-4">
                  <input 
                    type="text" 
                    value={replyContent}
                    onChange={e => setReplyContent(e.target.value)}
                    placeholder="Type your reply..."
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-[#0B2136]"
                    required
                  />
                  <button 
                    type="submit" 
                    disabled={replying}
                    className="px-6 bg-[#0B2136] text-white rounded-lg hover:bg-[#14314c] transition-colors disabled:opacity-50 font-medium flex items-center gap-2"
                  >
                    {replying ? "Sending..." : <><Send className="w-4 h-4" /> Send</>}
                  </button>
                </form>
              </div>
            ) : (
              <div className="p-4 border-t border-gray-200 bg-gray-50 text-center text-gray-500 flex items-center justify-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                This ticket has been resolved and is closed to new replies.
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
            <p>Select a ticket to view the conversation</p>
          </div>
        )}
      </div>
    </>
  );
}
