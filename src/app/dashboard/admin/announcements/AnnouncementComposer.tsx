"use client";

import { useState } from "react";
import { Send, Users, Activity, Tag, Sparkles, CheckCircle, ShieldAlert } from "lucide-react";
import { RichEditor } from "@/components/ui/RichEditor";
import { broadcastAnnouncement, AnnouncementCohort } from "@/actions/announcement.actions";

export default function AnnouncementComposer() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [cohort, setCohort] = useState<AnnouncementCohort>("ALL_CONSULTANTS");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const cohorts = [
    { id: "ALL_CONSULTANTS", label: "All Registered Consultants", desc: "Everyone on Verixa (Verified or Pending)", icon: <Users className="w-4 h-4" /> },
    { id: "VERIFIED_CONSULTANTS", label: "Verified RCICs Only", desc: "Trust-checked consultants who are active", icon: <Sparkles className="w-4 h-4" /> },
    { id: "UNVERIFIED_CONSULTANTS", label: "Pending/Unverified", desc: "Consultants awaiting validation", icon: <Activity className="w-4 h-4" /> },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setError("Please enter a subject line.");
      return;
    }
    if (!body || body.length < 10) {
      setError("Please write a meaningful announcement body.");
      return;
    }

    const confirmed = confirm(`⚠️ Deploy Announcement?\nCohort: ${cohorts.find(c => c.id === cohort)?.label}\nSubject: ${subject}\n\nThis will send an email to all matched consultants and show a priority banner in their dashboard.`);
    if (!confirmed) return;

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const res = await broadcastAnnouncement(cohort, subject, body);
      setSuccess(true);
      setSubject("");
      setBody("");
      alert(`Success! Broadcast deployed to ${res.count} consultants.`);
    } catch (err: any) {
      setError(err.message || "Failed to broadcast announcement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border text-[#0F2A44] border-gray-200 rounded-3xl p-8 shadow-sm">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-2xl font-serif font-black flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#2FA4A9]" /> In-App Announcements
          </h2>
          <p className="text-gray-500 text-sm mt-1">Push alerts directly to consultant dashboards and send a notification email.</p>
        </div>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 text-green-700 font-bold rounded-2xl flex items-center gap-2">
          <CheckCircle className="w-5 h-5" /> Announcement has been successfully deployed.
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-600 font-bold rounded-2xl flex items-center gap-2">
          <ShieldAlert className="w-5 h-5" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* COHORT SELECTOR */}
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#2FA4A9]" /> Target Audience
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {cohorts.map(c => (
              <div
                key={c.id}
                onClick={() => setCohort(c.id as AnnouncementCohort)}
                className={`cursor-pointer border p-4 rounded-2xl transition-all ${
                  cohort === c.id
                    ? "bg-[#2FA4A9]/10 border-[#2FA4A9] shadow-[0_0_15px_rgba(47,164,169,0.1)]"
                    : "bg-gray-50 border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className={`flex items-center gap-2 font-bold text-sm mb-1 ${cohort === c.id ? "text-[#0F2A44]" : "text-gray-700"}`}>
                  <span className={cohort === c.id ? "text-[#2FA4A9]" : "text-gray-400"}>{c.icon}</span>
                  {c.label}
                </div>
                <div className="text-[10px] text-gray-500 leading-tight">{c.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* SUBJECT */}
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">
            Announcement Title
          </label>
          <div className="relative">
            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              required
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="e.g. Important Changes to the Booking System"
              className="w-full bg-gray-50 border border-gray-200 pl-11 pr-4 py-4 rounded-2xl text-[#1A1F2B] font-bold focus:outline-none focus:border-[#2FA4A9] focus:bg-white transition-all shadow-sm"
            />
          </div>
          <p className="text-[10px] text-gray-400 font-medium mt-2">This will act as the email subject and the banner title on their dashboard.</p>
        </div>

        {/* BODY */}
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">
            Announcement Body (Rich HTML)
          </label>
          <div className="relative z-10 border border-gray-200 rounded-2xl overflow-hidden focus-within:border-[#2FA4A9] transition-all bg-white shadow-sm">
             <RichEditor
               value={body}
               onChange={val => setBody(val)}
               placeholder="Draft your announcement here. Formatting is preserved."
             />
          </div>
        </div>

        {/* ACTIONS */}
        <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-500 w-1/2">
            This will immediately trigger emails and push real-time banners to to the selected consultants. 
            Once read, the banner automatically dismisses.
          </p>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-[#0F2A44] text-white px-8 py-4 rounded-xl font-bold hover:bg-black transition-all shadow-md disabled:opacity-50"
          >
            {loading ? <><Activity className="w-5 h-5 animate-spin" /> Broadcasting...</> : <><Send className="w-5 h-5" /> Deploy Broadcast</>}
          </button>
        </div>
      </form>
    </div>
  );
}
