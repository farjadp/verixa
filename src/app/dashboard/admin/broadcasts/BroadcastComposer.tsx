"use client";

import { useState, useEffect } from "react";
import { Send, Users, Activity, Tag, Sparkles, CheckCircle, ShieldAlert } from "lucide-react";
import { getAudienceCount, sendBroadcast } from "@/actions/broadcast.actions";

export default function BroadcastComposer() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [audienceCount, setAudienceCount] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    cohort: "ALL_USERS",
    subject: "",
    body: "",
  });

  const cohorts = [
    { id: "ALL_USERS", label: "Full Database", desc: "Everyone registered on Verixa" },
    { id: "CLIENTS", label: "General Clients", desc: "Standard end-users only" },
    { id: "CONSULTANTS", label: "All Network RCICs", desc: "Consultants worldwide" },
    { id: "VERIFIED_CONSULTANTS", label: "Verified RCICs", desc: "Trust-checked consultants" },
    { id: "UNVERIFIED_CONSULTANTS", label: "Pending RCICs", desc: "Consultants awaiting approval" },
  ];

  // Predictive Audience Counting effect
  useEffect(() => {
    const fetchAudience = async () => {
      try {
        const count = await getAudienceCount(formData.cohort);
        setAudienceCount(count);
      } catch (e) {
        console.error(e);
      }
    };
    fetchAudience();
  }, [formData.cohort]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject || (!formData.body && formData.body.length < 10)) {
      setError("Please write a meaningful subject and body.");
      return;
    }
    if (audienceCount === 0) {
      setError("This cohort has 0 active targets.");
      return;
    }

    if (!confirm(`Are you certain? This will ping ${audienceCount} actual email addresses.`)) return;

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      // Very basic markdown to HTML fallback converter for MVP
      let formattedHtml = formData.body
        .replace(/\n\n/g, "</p><p>")
        .replace(/\n/g, "<br/>")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      
      formattedHtml = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;"><p>${formattedHtml}</p></div>`;

      await sendBroadcast(formData.cohort, formData.subject, formattedHtml);
      setSuccess(true);
      setFormData({ ...formData, subject: "", body: "" });
    } catch (err: any) {
      setError(err.message || "Broadcast engine failed to deploy.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0F2A44]/80 backdrop-blur-xl border border-gray-800 rounded-3xl p-8 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]">
      
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-2xl font-serif font-black text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" /> New Broadcast
          </h2>
          <p className="text-gray-400 text-sm mt-1">Configure your target node and payload.</p>
        </div>
        
        {/* Real-time Audience Metric */}
        {audienceCount !== null && (
          <div className="bg-black/30 border border-white/10 px-4 py-2 rounded-2xl flex flex-col items-center min-w-[120px]">
             <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1 flex items-center gap-1">
                <Users className="w-3 h-3 text-[#2FA4A9]" /> Active Targets
             </span>
             <span className="text-3xl font-black text-white leading-none">
                {audienceCount}
             </span>
          </div>
        )}
      </div>

      {success && (
        <div className="mb-8 p-4 bg-green-500/10 border border-green-500/20 text-green-400 font-bold rounded-2xl flex items-center justify-center gap-2">
          <CheckCircle className="w-5 h-5" /> Transmission Complete!
        </div>
      )}

      {error && (
        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 text-red-500 font-bold rounded-2xl flex items-center justify-center gap-2">
          <ShieldAlert className="w-5 h-5" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Cohort Selection GRID */}
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-[#2FA4A9]" /> Target Node (Cohort)
          </label>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {cohorts.map(c => (
              <div 
                key={c.id}
                onClick={() => setFormData({ ...formData, cohort: c.id })}
                className={`cursor-pointer border p-3 rounded-2xl transition-all ${
                  formData.cohort === c.id 
                    ? "bg-[#2FA4A9]/10 border-[#2FA4A9] shadow-[0_0_20px_rgba(47,164,169,0.2)]" 
                    : "bg-black/20 border-gray-800 hover:border-gray-600"
                }`}
              >
                <div className={`font-bold text-sm mb-1 ${formData.cohort === c.id ? "text-white" : "text-gray-300"}`}>
                  {c.label}
                </div>
                <div className="text-[10px] text-gray-500 leading-tight">
                  {c.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Subject Line */}
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Payload Label (Subject)</label>
          <div className="relative">
            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              required
              value={formData.subject}
              onChange={(e) => setFormData({...formData, subject: e.target.value})}
              placeholder="e.g. Action Required: Your Verixa Profile Requires Updates"
              className="w-full bg-black/40 border border-gray-700 pl-11 pr-4 py-4 rounded-2xl text-white font-medium focus:outline-none focus:border-[#2FA4A9] focus:shadow-[0_0_15px_rgba(47,164,169,0.1)] transition-all"
            />
          </div>
        </div>

        {/* Rich Body Content */}
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex justify-between">
            <span>Transmission Body (HTML/Text)</span>
            <span className="text-[#2FA4A9]">**Markdown Bold Supported**</span>
          </label>
          <textarea 
            required
            rows={12}
            value={formData.body}
            onChange={(e) => setFormData({...formData, body: e.target.value})}
            placeholder="Type your message. We inject a unified wrapper automatically."
            className="w-full bg-black/40 border border-gray-700 p-4 rounded-2xl text-gray-200 text-sm focus:outline-none focus:border-[#2FA4A9] focus:shadow-[0_0_15px_rgba(47,164,169,0.1)] transition-all resize-y custom-scrollbar"
          />
        </div>

        {/* Action Belt */}
        <div className="pt-4 border-t border-gray-800/50 flex justify-end">
          <button 
            type="submit" 
            disabled={loading || audienceCount === 0 || audienceCount === null}
            className="flex items-center gap-2 bg-[#2FA4A9] text-white px-8 py-4 rounded-2xl font-black uppercase tracking-wider shadow-lg hover:shadow-[#2FA4A9]/40 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {loading ? (
              <><Activity className="w-5 h-5 animate-spin" /> Transmitting...</>
            ) : (
              <><Send className="w-5 h-5" /> Deploy Broadcast</>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
