"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Send, Users, Activity, Tag, Sparkles, CheckCircle,
  ShieldAlert, Mail, MessageSquare, Filter, Database,
  Building2, Globe, Zap, ChevronDown
} from "lucide-react";
import { getAudienceCount, sendBroadcast } from "@/actions/broadcast.actions";
import { sendSmsBroadcast } from "@/actions/sms.actions";
import { RichEditor } from "@/components/ui/RichEditor";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type DomainType = "ALL" | "CORPORATE" | "PUBLIC";
type TransmissionType = "EMAIL" | "SMS";

interface Cohort {
  id: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
  source: "verixa" | "cicc";
  showDomainFilter?: boolean;
}

const VERIXA_COHORTS: Cohort[] = [
  { id: "ALL_USERS",              label: "All Registered",     desc: "Everyone on Verixa",             icon: <Users className="w-4 h-4" />,    source: "verixa" },
  { id: "CLIENTS",                label: "Clients Only",       desc: "End-users, no consultants",      icon: <Users className="w-4 h-4" />,    source: "verixa" },
  { id: "CONSULTANTS",            label: "All RCICs",          desc: "All consultant accounts",        icon: <Database className="w-4 h-4" />, source: "verixa" },
  { id: "VERIFIED_CONSULTANTS",   label: "Verified RCICs",     desc: "Trust-checked consultants",      icon: <Zap className="w-4 h-4" />,      source: "verixa" },
  { id: "UNVERIFIED_CONSULTANTS", label: "Pending RCICs",      desc: "Consultants awaiting approval",  icon: <Activity className="w-4 h-4" />, source: "verixa" },
];

const CICC_COHORTS: Cohort[] = [
  { id: "CICC_ALL",       label: "Full CICC Registry",   desc: "All 9,911 RCIC emails",         icon: <Database className="w-4 h-4" />, source: "cicc", showDomainFilter: true },
  { id: "CICC_ACTIVE",    label: "Active RCICs Only",    desc: "Entitled to practise",          icon: <Zap className="w-4 h-4" />,      source: "cicc", showDomainFilter: true },
  { id: "CICC_CORPORATE", label: "Corporate Emails",     desc: "Business domains only (~3.5k)", icon: <Building2 className="w-4 h-4" />, source: "cicc", showDomainFilter: false },
  { id: "CICC_PUBLIC",    label: "Public Emails",        desc: "Gmail, Yahoo, etc. (~6.2k)",    icon: <Globe className="w-4 h-4" />,    source: "cicc", showDomainFilter: false },
];

const LIMIT_OPTIONS = [
  { value: 50,   label: "50 recipients" },
  { value: 200,  label: "200 recipients" },
  { value: 500,  label: "500 recipients" },
  { value: 1000, label: "1,000 recipients" },
  { value: 2500, label: "2,500 recipients" },
  { value: 0,    label: "Entire cohort (no limit)" },
];

// ─── COMPONENT ────────────────────────────────────────────────────────────────
interface BroadcastComposerProps {
  dailyUsed?: number;
  dailyLimit?: number;
}

export default function BroadcastComposer({ dailyUsed = 0, dailyLimit = 100 }: BroadcastComposerProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);
  const [transmissionType, setTransmissionType] = useState<TransmissionType>("EMAIL");

  const [cohort, setCohort]           = useState("CICC_ALL");
  const [domainType, setDomainType]   = useState<DomainType>("ALL");
  const [activeOnly, setActiveOnly]   = useState(false);
  const [limit, setLimit]             = useState(50);
  const [subject, setSubject]         = useState("");
  const [body, setBody]               = useState("");

  const selectedCohort = [...VERIXA_COHORTS, ...CICC_COHORTS].find(c => c.id === cohort);
  const isCICC = selectedCohort?.source === "cicc";

  // Live audience count
  const refreshCount = useCallback(async () => {
    setCountLoading(true);
    try {
      const count = await getAudienceCount(cohort, transmissionType, {
        domainType: isCICC ? domainType : "ALL",
        activeOnly: isCICC ? activeOnly : false,
        limit,
      });
      setAudienceCount(count);
    } catch { /* silently ignore */ }
    finally { setCountLoading(false); }
  }, [cohort, transmissionType, domainType, activeOnly, limit, isCICC]);

  useEffect(() => { refreshCount(); }, [refreshCount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transmissionType === "EMAIL" && !subject.trim()) {
      setError("Please enter a subject line.");
      return;
    }
    if (!body || body.length < 10) {
      setError("Please write a meaningful message body.");
      return;
    }
    if (!audienceCount || audienceCount === 0) {
      setError("This cohort + filter combination has 0 targets.");
      return;
    }

    const confirmed = confirm(
      `⚠️ CONFIRM: This will send to ${audienceCount.toLocaleString()} real email addresses.\n\nCohort: ${selectedCohort?.label}\nSubject: ${subject}\n\nProceed?`
    );
    if (!confirmed) return;

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      if (transmissionType === "SMS") {
        await sendSmsBroadcast(cohort, body);
      } else {
        await sendBroadcast(cohort, subject, body, {
          domainType: isCICC ? domainType : "ALL",
          activeOnly: isCICC ? activeOnly : false,
          limit,
        });
      }
      setSuccess(true);
      setSubject("");
      setBody("");
    } catch (err: any) {
      setError(err.message || "Broadcast engine failed.");
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
          <p className="text-gray-400 text-sm mt-1">Configure target cohort and compose your payload.</p>
        </div>

        <div className="flex gap-3">
          {/* Daily quota */}
          <div className="bg-black/30 border border-white/10 px-4 py-2 rounded-2xl flex flex-col items-center min-w-[110px]">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Daily Quota</span>
            <span className={`text-2xl font-black leading-none ${dailyUsed >= dailyLimit ? "text-red-400" : dailyUsed > dailyLimit * 0.7 ? "text-amber-400" : "text-green-400"}`}>
              {dailyLimit - dailyUsed}
            </span>
            <span className="text-[9px] text-gray-600 mt-0.5">left of {dailyLimit}/day</span>
          </div>

          {/* Live audience count */}
          <div className="bg-black/30 border border-white/10 px-4 py-2 rounded-2xl flex flex-col items-center min-w-[120px]">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1 flex items-center gap-1">
              <Users className="w-3 h-3 text-[#2FA4A9]" /> Targets
            </span>
            <span className={`text-3xl font-black leading-none ${countLoading ? "text-gray-600 animate-pulse" : "text-white"}`}>
              {audienceCount !== null ? audienceCount.toLocaleString() : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Status messages */}
      {success && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 text-green-400 font-bold rounded-2xl flex items-center justify-center gap-2">
          <CheckCircle className="w-5 h-5" /> Transmission deployed successfully!
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 font-bold rounded-2xl flex items-center justify-center gap-2">
          <ShieldAlert className="w-5 h-5" /> {error}
        </div>
      )}

      {/* Channel tabs */}
      <div className="flex gap-3 mb-8">
        <button
          onClick={() => setTransmissionType("EMAIL")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold transition-all border ${
            transmissionType === "EMAIL"
              ? "bg-[#2FA4A9]/20 border-[#2FA4A9] text-[#2FA4A9]"
              : "border-gray-800 text-gray-400 bg-black/20 hover:border-gray-600"
          }`}
        >
          <Mail className="w-5 h-5" /> Rich Email Broadcast
        </button>
        <button
          onClick={() => setTransmissionType("SMS")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold transition-all border ${
            transmissionType === "SMS"
              ? "bg-amber-400/20 border-amber-400 text-amber-400"
              : "border-gray-800 text-gray-400 bg-black/20 hover:border-gray-600"
          }`}
        >
          <MessageSquare className="w-5 h-5" /> SMS Text Campaign
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-7">

        {/* ── SOURCE TABS ── */}
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-[#2FA4A9]" /> Data Source
          </label>
          <div className="flex gap-3 mb-4">
            <button type="button"
              onClick={() => { setCohort("CICC_ALL"); }}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all border ${
                isCICC ? "bg-[#2FA4A9]/15 border-[#2FA4A9] text-[#2FA4A9]" : "border-gray-700 text-gray-500 bg-black/20 hover:border-gray-600"
              }`}
            >
              🏛️ CICC Registry (9,911)
            </button>
            <button type="button"
              onClick={() => { setCohort("ALL_USERS"); }}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all border ${
                !isCICC ? "bg-purple-500/15 border-purple-500 text-purple-400" : "border-gray-700 text-gray-500 bg-black/20 hover:border-gray-600"
              }`}
            >
              🔐 Verixa Users (registered)
            </button>
          </div>

          {/* Cohort grid */}
          <div className="grid grid-cols-2 gap-3">
            {(isCICC ? CICC_COHORTS : VERIXA_COHORTS).map(c => (
              <div
                key={c.id}
                onClick={() => setCohort(c.id)}
                className={`cursor-pointer border p-3 rounded-2xl transition-all ${
                  cohort === c.id
                    ? "bg-[#2FA4A9]/10 border-[#2FA4A9] shadow-[0_0_20px_rgba(47,164,169,0.15)]"
                    : "bg-black/20 border-gray-800 hover:border-gray-600"
                }`}
              >
                <div className={`flex items-center gap-2 font-bold text-sm mb-1 ${cohort === c.id ? "text-white" : "text-gray-300"}`}>
                  <span className={cohort === c.id ? "text-[#2FA4A9]" : "text-gray-500"}>{c.icon}</span>
                  {c.label}
                </div>
                <div className="text-[10px] text-gray-500 leading-tight">{c.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CICC FILTERS ── */}
        {isCICC && (
          <div className="bg-black/20 border border-gray-800 rounded-2xl p-5 space-y-5">
            <div className="flex items-center gap-2 text-xs font-bold text-[#2FA4A9] uppercase tracking-widest">
              <Filter className="w-3.5 h-3.5" /> Targeting Filters
            </div>

            {/* Domain type */}
            {selectedCohort?.showDomainFilter && (
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">
                  Email Domain Type
                </label>
                <div className="flex gap-2">
                  {(["ALL", "CORPORATE", "PUBLIC"] as DomainType[]).map(d => (
                    <button
                      type="button"
                      key={d}
                      onClick={() => setDomainType(d)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                        domainType === d
                          ? "bg-white/10 border-white/20 text-white"
                          : "border-gray-800 text-gray-500 bg-black/10 hover:border-gray-600"
                      }`}
                    >
                      {d === "ALL" && "🌐 All Types"}
                      {d === "CORPORATE" && "🏢 Corporate"}
                      {d === "PUBLIC" && "📧 Public (Gmail...)"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Active only toggle */}
            {selectedCohort?.id !== "CICC_ACTIVE" && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-gray-300 uppercase tracking-widest">Active RCICs Only</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Exclude suspended or inactive licenses</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveOnly(v => !v)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${activeOnly ? "bg-[#2FA4A9]" : "bg-gray-700"}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${activeOnly ? "translate-x-7" : "translate-x-1"}`} />
                </button>
              </div>
            )}

            {/* Limit selector */}
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">
                Send Limit (batch size)
              </label>
              <div className="relative">
                <select
                  value={limit}
                  onChange={e => setLimit(Number(e.target.value))}
                  className="w-full bg-black/40 border border-gray-700 px-4 py-3 pr-10 rounded-xl text-white font-semibold text-sm focus:outline-none focus:border-[#2FA4A9] appearance-none cursor-pointer"
                >
                  {LIMIT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value} className="bg-[#0F2A44]">
                      {o.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
              {limit === 0 && (
                <p className="text-xs text-amber-400 font-medium mt-1.5">
                  ⚠️ No limit set — will send to the entire cohort.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── SUBJECT ── */}
        {transmissionType === "EMAIL" && (
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">
              Subject Line
            </label>
            <div className="relative">
              <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                required
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="e.g. Action Required: Your Verixa Profile Requires Updates"
                className="w-full bg-black/40 border border-gray-700 pl-11 pr-4 py-4 rounded-2xl text-white font-medium focus:outline-none focus:border-[#2FA4A9] focus:shadow-[0_0_15px_rgba(47,164,169,0.1)] transition-all"
              />
            </div>
          </div>
        )}

        {/* ── BODY ── */}
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex justify-between">
            <span>Message Body ({transmissionType === "EMAIL" ? "Rich HTML" : "Plain Text"})</span>
            {transmissionType === "SMS" && (
              <span className={body.length > 160 ? "text-amber-500" : "text-[#2FA4A9]"}>
                {body.length}/160
              </span>
            )}
          </label>

          {transmissionType === "EMAIL" ? (
            <RichEditor
              value={body}
              onChange={val => setBody(val)}
              placeholder="Type your message. We inject a premium HTML wrapper automatically."
            />
          ) : (
            <textarea
              required
              rows={5}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Keep it short. e.g. Verixa: Important update available on your profile — login now."
              className="w-full bg-black/40 border border-gray-700 p-4 rounded-2xl text-gray-200 text-sm focus:outline-none focus:border-[#2FA4A9] transition-all resize-y"
            />
          )}
        </div>

        {/* ── SEND BUTTON ── */}
        <div className="pt-4 border-t border-gray-800/50 flex items-center justify-between gap-4">
          <p className="text-xs text-gray-500">
            {audienceCount !== null && audienceCount > 0 ? (
              <span>Sending to <span className="text-white font-bold">{audienceCount.toLocaleString()}</span> addresses via Resend BCC chunks of 50</span>
            ) : (
              <span className="text-amber-500">No targets match current filters</span>
            )}
          </p>
          <button
            type="submit"
            disabled={loading || !audienceCount || audienceCount === 0}
            className="flex items-center gap-2 bg-[#2FA4A9] text-white px-8 py-4 rounded-2xl font-black uppercase tracking-wider shadow-lg hover:shadow-[#2FA4A9]/40 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
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
