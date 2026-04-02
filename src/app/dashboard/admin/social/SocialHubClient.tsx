"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { igniteSocialEngine, updateSocialJob, getSocialJobs } from "@/actions/social.actions";
import {
  publishToLinkedIn, publishToTwitter, publishToTelegram, publishAll,
  getLinkedInAuthUrl, checkLinkedInStatus
} from "@/actions/publish.actions";
import {
  Play, Share2, CheckCircle2, AlertCircle, RefreshCcw,
  Linkedin, Twitter, Send, Save, Loader2, Link2, Sparkles,
  Rocket, ExternalLink, ShieldCheck, ShieldX, Wifi
} from "lucide-react";

// ─── Status Badge Component ───────────────────────────────────────────────────
function PlatformBadge({ status, label, icon: Icon }: { status?: string | null; label: string; icon: any }) {
  const s = status || "PENDING";
  const colors: Record<string, string> = {
    PENDING: "bg-gray-100 text-gray-500 border-gray-200",
    POSTED:  "bg-green-50 text-green-600 border-green-200",
    FAILED:  "bg-red-50 text-red-600 border-red-200",
    SKIPPED: "bg-yellow-50 text-yellow-600 border-yellow-200",
  };
  const icons: Record<string, string> = {
    PENDING: "○", POSTED: "✓", FAILED: "✗", SKIPPED: "—"
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border ${colors[s] || colors.PENDING}`}>
      <Icon className="w-3 h-3" />
      {label}: {icons[s] || "○"}
    </span>
  );
}

// ─── Publish Button ───────────────────────────────────────────────────────────
function PublishBtn({
  label, icon: Icon, onClick, status, loading, colorClass
}: {
  label: string; icon: any; onClick: () => void;
  status?: string | null; loading: boolean; colorClass: string;
}) {
  const isPosted = status === "POSTED";
  return (
    <button
      onClick={onClick}
      disabled={loading || isPosted}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 ${
        isPosted
          ? "bg-green-50 text-green-600 border border-green-200 cursor-default"
          : `${colorClass} text-white shadow-sm hover:opacity-90`
      }`}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isPosted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
      {isPosted ? "Posted" : label}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SocialHubClient({
  initialPosts,
}: {
  initialPosts: any[];
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [publishingPlatform, setPublishingPlatform] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [linkedinConnected, setLinkedinConnected] = useState<boolean | null>(null);

  const [editForms, setEditForms] = useState({ linkedin: "", x: "", telegram: "" });

  const selectedPost = posts.find((p) => p.id === selectedPostId);
  const socialJob = selectedPost?.socialJobs?.[0];

  // Check URL params for LinkedIn OAuth result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("linkedin_connected")) {
      setSuccess("✅ LinkedIn Connected Successfully!");
      setLinkedinConnected(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (params.get("linkedin_error")) {
      setError(`LinkedIn Error: ${params.get("linkedin_error")}`);
      window.history.replaceState({}, "", window.location.pathname);
    }

    // Check LinkedIn status
    checkLinkedInStatus().then((r) => setLinkedinConnected(r.connected));
  }, []);

  const handleSelectPost = (id: string) => {
    setSelectedPostId(id);
    const post = posts.find((p) => p.id === id);
    const job = post?.socialJobs?.[0];
    setEditForms({
      linkedin: job?.linkedinCopy || "",
      x: job?.twitterCopy || "",
      telegram: job?.telegramCopy || "",
    });
    setError(""); setSuccess("");
  };

  const handleIgniteEngine = async (postId: string) => {
    setLoading(true); setError(""); setSuccess("");
    try {
      if (!confirm("This will execute the 4-Layer AI Content Engine. Continue?")) { setLoading(false); return; }
      await igniteSocialEngine(postId);
      setSuccess("✅ AI Engine Completed! Review the generated drafts below.");
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: any) {
      setError(e.message || "Failed.");
      setLoading(false);
    }
  };

  const handleApprovePayload = async () => {
    if (!socialJob) return;
    setLoading(true); setError(""); setSuccess("");
    try {
      await updateSocialJob(socialJob.id, {
        linkedinCopy: editForms.linkedin,
        twitterCopy: editForms.x,
        telegramCopy: editForms.telegram,
        status: "APPROVED",
      });
      setSuccess("✅ Drafts approved and saved. You can now publish.");
      setPosts(posts.map((p) => {
        if (p.id === selectedPostId) {
          p.socialJobs[0] = {
            ...p.socialJobs[0],
            linkedinCopy: editForms.linkedin,
            twitterCopy: editForms.x,
            telegramCopy: editForms.telegram,
            status: "APPROVED",
          };
        }
        return p;
      }));
    } catch (e: any) {
      setError(e.message || "Failed to save.");
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (platform: "linkedin" | "twitter" | "telegram" | "all") => {
    if (!socialJob) return;
    if (socialJob.status !== "APPROVED") {
      setError("Please approve the drafts first before publishing.");
      return;
    }
    setPublishingPlatform(platform); setError(""); setSuccess("");

    let results: { ok: boolean; platform: string; error?: string }[] = [];
    try {
      if (platform === "telegram") results = [await publishToTelegram(socialJob.id)];
      else if (platform === "linkedin") results = [await publishToLinkedIn(socialJob.id)];
      else if (platform === "twitter") results = [await publishToTwitter(socialJob.id)];
      else results = await publishAll(socialJob.id);

      const failed = results.filter((r) => !r.ok);
      const posted = results.filter((r) => r.ok);

      if (posted.length > 0) setSuccess(`✅ Published to: ${posted.map((r) => r.platform).join(", ")}`);
      if (failed.length > 0) setError(`❌ Failed: ${failed.map((r) => `${r.platform} — ${r.error}`).join(" | ")}`);

      // Refresh post data
      setTimeout(() => window.location.reload(), 2000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPublishingPlatform(null);
    }
  };

  const handleConnectLinkedIn = async () => {
    const url = await getLinkedInAuthUrl();
    window.location.href = url;
  };

  let parsedHooks: string[] = [];
  let parsedCtas: string[] = [];
  try {
    if (socialJob?.hooks) parsedHooks = JSON.parse(socialJob.hooks);
    if (socialJob?.ctas) parsedCtas = JSON.parse(socialJob.ctas);
  } catch (e) {}

  const telegramParts = editForms.telegram.split("\n\n---\n\n");
  const telegramEN = telegramParts[0] || "";
  const telegramFA = telegramParts[1] || "";

  return (
    <div className="w-full flex flex-col xl:flex-row gap-6">

      {/* ─── LEFT: Article Feed ─── */}
      <div className="xl:w-1/3 flex flex-col gap-4">

        {/* LinkedIn connection banner */}
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold ${
          linkedinConnected === true ? "bg-blue-50 text-blue-700 border-blue-100"
          : linkedinConnected === false ? "bg-orange-50 text-orange-700 border-orange-100"
          : "bg-gray-50 text-gray-500 border-gray-100"
        }`}>
          {linkedinConnected === true ? <><ShieldCheck className="w-4 h-4" /> LinkedIn Connected</> :
           linkedinConnected === false ? (
            <><ShieldX className="w-4 h-4" /> LinkedIn not connected —<button onClick={handleConnectLinkedIn} className="underline ml-1 hover:text-blue-900">Connect Now</button></>
          ) : <><Wifi className="w-4 h-4" /> Checking LinkedIn...</>}
        </div>

        <div className="bg-white border border-[#e5e7eb] p-5 rounded-2xl flex flex-col shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest border-b border-[#e5e7eb] pb-3 mb-4">
            Published CMS Articles
          </h3>
          <div className="flex flex-col gap-3 overflow-y-auto max-h-[70vh] pr-2">
            {posts.map((post) => {
              const job = post.socialJobs?.[0];
              let badge = <span className="text-[10px] bg-gray-100 text-gray-500 font-bold px-2 py-0.5 rounded">NO SOCIALS</span>;
              if (job?.status === "GENERATING") badge = <span className="text-[10px] bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded animate-pulse">GENERATING...</span>;
              if (job?.status === "REVIEW") badge = <span className="text-[10px] bg-yellow-50 text-yellow-600 font-bold px-2 py-0.5 rounded">PENDING REVIEW</span>;
              if (job?.status === "APPROVED") badge = <span className="text-[10px] bg-purple-50 text-purple-600 font-bold px-2 py-0.5 rounded">APPROVED</span>;
              if (job?.status === "POSTED") badge = <span className="text-[10px] bg-green-50 text-green-600 font-bold px-2 py-0.5 rounded flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> POSTED</span>;
              if (job?.status === "FAILED") badge = <span className="text-[10px] bg-red-50 text-red-600 font-bold px-2 py-0.5 rounded">FAILED</span>;

              return (
                <button
                  key={post.id}
                  onClick={() => handleSelectPost(post.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedPostId === post.id
                      ? "bg-white border-[#2FA4A9] shadow-sm"
                      : "bg-white border-[#e5e7eb] hover:bg-gray-50"
                  }`}
                >
                  {post.coverImage && (
                    <img src={post.coverImage} alt="" className="w-full h-20 object-cover rounded-lg mb-2" />
                  )}
                  <h4 className={`text-sm font-bold line-clamp-2 ${selectedPostId === post.id ? "text-[#2FA4A9]" : "text-gray-900"}`}>
                    {post.title}
                  </h4>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {badge}
                    {job && (
                      <>
                        <PlatformBadge status={job.telegramStatus} label="TG" icon={Send} />
                        <PlatformBadge status={job.linkedinStatus} label="LI" icon={Linkedin} />
                        <PlatformBadge status={job.twitterStatus} label="X" icon={Twitter} />
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── RIGHT: Distribution Workspace ─── */}
      <div className="xl:w-2/3 flex flex-col gap-4">
        {!selectedPost ? (
          <div className="bg-white border border-[#e5e7eb] rounded-2xl flex items-center justify-center p-12 min-h-[600px] shadow-sm flex-col">
            <Share2 className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-500 font-bold text-center">Select an article to view or publish its social distribution.</p>
          </div>
        ) : (
          <div className="bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden shadow-sm flex flex-col min-h-[700px]">

            {/* Header */}
            <div className="bg-white border-b border-[#e5e7eb] p-5 flex flex-col gap-3">
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Selected Article</span>
                  <h2 className="text-base font-black text-gray-900 mt-0.5 line-clamp-2">{selectedPost.title}</h2>
                  <a href={`/blog/${selectedPost.slug}`} target="_blank"
                    className="text-[11px] text-blue-600 font-bold flex items-center gap-1 mt-1 hover:underline">
                    <Link2 className="w-3 h-3" /> getverixa.com/blog/{selectedPost.slug}
                  </a>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 shrink-0">
                  {!socialJob && (
                    <button onClick={() => handleIgniteEngine(selectedPost.id)} disabled={loading}
                      className="bg-[#0F2A44] hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50 shadow">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      Generate with AI
                    </button>
                  )}
                  {socialJob && socialJob.status !== "POSTED" && (
                    <button onClick={handleApprovePayload} disabled={loading}
                      className="bg-[#0F2A44] hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50 shadow">
                      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Save & Approve
                    </button>
                  )}
                  {socialJob?.status === "APPROVED" && (
                    <button onClick={() => handlePublish("all")} disabled={!!publishingPlatform}
                      className="bg-gradient-to-r from-[#2FA4A9] to-[#0F2A44] text-white px-5 py-2 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50">
                      {publishingPlatform === "all" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                      🚀 Publish All
                    </button>
                  )}
                </div>
              </div>

              {/* Per-platform publish buttons (APPROVED state) */}
              {socialJob?.status === "APPROVED" && (
                <div className="flex flex-wrap gap-2 pt-1 border-t border-[#f3f4f6]">
                  <PublishBtn label="Telegram" icon={Send} colorClass="bg-[#229ED9]"
                    status={socialJob.telegramStatus} loading={publishingPlatform === "telegram"}
                    onClick={() => handlePublish("telegram")} />
                  <PublishBtn label="LinkedIn" icon={Linkedin} colorClass="bg-[#0A66C2]"
                    status={socialJob.linkedinStatus} loading={publishingPlatform === "linkedin"}
                    onClick={() => handlePublish("linkedin")} />
                  <PublishBtn label="X / Twitter" icon={Twitter} colorClass="bg-black"
                    status={socialJob.twitterStatus} loading={publishingPlatform === "twitter"}
                    onClick={() => handlePublish("twitter")} />

                  {/* Regenerate */}
                  <button onClick={() => handleIgniteEngine(selectedPost.id)} disabled={loading || !!publishingPlatform}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-500 border border-[#e5e7eb] hover:bg-gray-50 transition-colors disabled:opacity-40">
                    <RefreshCcw className="w-3 h-3" /> Regenerate
                  </button>
                </div>
              )}
            </div>

            {/* Notifications */}
            {error && <div className="bg-red-50 text-red-600 p-4 border-b border-red-100 text-sm font-medium">{error}</div>}
            {success && <div className="bg-green-50 text-green-700 p-4 border-b border-green-100 text-sm font-medium">{success}</div>}

            {/* Workspace */}
            <div className="p-5 flex-1 overflow-y-auto bg-gray-50/30">

              {!socialJob && !loading && (
                <div className="flex flex-col items-center justify-center h-64 text-center text-gray-400 max-w-sm mx-auto gap-4">
                  <Sparkles className="w-12 h-12 text-gray-300" />
                  <p className="text-sm leading-relaxed">Click "Generate with AI" to create optimized social copies for LinkedIn, X, and Telegram (EN + FA) in one shot.</p>
                </div>
              )}

              {loading && !socialJob && (
                <div className="flex flex-col items-center justify-center h-64 text-center text-blue-600 max-w-sm mx-auto gap-4 animate-pulse">
                  <Loader2 className="w-12 h-12 animate-spin" />
                  <p className="text-sm font-bold">Running 4-Layer AI Engine...<br/>Generating LinkedIn · X/Twitter · Telegram (EN) · Telegram (FA)</p>
                </div>
              )}

              {socialJob && (
                <div className="flex flex-col gap-6">

                  {/* Hooks & CTAs */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-white border border-[#e5e7eb] p-4 rounded-xl shadow-sm">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-[#2FA4A9] mb-3 border-b border-[#f0f0f0] pb-2">
                        Psychological Hooks
                      </h4>
                      <ul className="space-y-1.5 text-[11px] text-gray-600 font-medium list-decimal list-inside">
                        {parsedHooks.length > 0 ? parsedHooks.map((h, i) => <li key={i}>{h}</li>) : <li>None generated.</li>}
                      </ul>
                    </div>
                    <div className="bg-white border border-[#e5e7eb] p-4 rounded-xl shadow-sm">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-3 border-b border-[#f0f0f0] pb-2">
                        Call-to-Actions
                      </h4>
                      <ul className="space-y-1.5 text-[11px] text-gray-600 font-medium list-decimal list-inside">
                        {parsedCtas.length > 0 ? parsedCtas.map((c, i) => <li key={i}>{c}</li>) : <li>None generated.</li>}
                      </ul>
                    </div>
                  </div>

                  {/* ─ LinkedIn ─ */}
                  <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-blue-50/60 px-4 py-2.5 flex items-center gap-2 border-b border-[#e5e7eb]">
                      <Linkedin className="w-4 h-4 text-[#0A66C2]" />
                      <span className="text-sm font-bold text-gray-900">LinkedIn</span>
                      <span className="text-[10px] text-gray-400 ml-auto">Professional · Thought Leadership</span>
                      <PlatformBadge status={socialJob.linkedinStatus} label="" icon={Linkedin} />
                    </div>
                    <textarea rows={10} className="w-full p-4 text-sm text-gray-700 focus:outline-none resize-y"
                      value={editForms.linkedin}
                      onChange={(e) => setEditForms({ ...editForms, linkedin: e.target.value })} />
                  </div>

                  {/* ─ Twitter ─ */}
                  <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-gray-50 px-4 py-2.5 flex items-center gap-2 border-b border-[#e5e7eb]">
                      <Twitter className="w-4 h-4 text-gray-900" />
                      <span className="text-sm font-bold text-gray-900">X / Twitter</span>
                      <span className={`text-[10px] ml-auto font-bold ${editForms.x?.length > 800 ? "text-red-500" : "text-gray-400"}`}>
                        {editForms.x?.length} chars
                      </span>
                      <PlatformBadge status={socialJob.twitterStatus} label="" icon={Twitter} />
                    </div>
                    <textarea rows={6} className="w-full p-4 text-sm text-gray-700 focus:outline-none resize-y"
                      value={editForms.x}
                      onChange={(e) => setEditForms({ ...editForms, x: e.target.value })} />
                  </div>

                  {/* ─ Telegram EN ─ */}
                  <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-blue-400/5 px-4 py-2.5 flex items-center gap-2 border-b border-[#e5e7eb]">
                      <Send className="w-4 h-4 text-[#229ED9]" />
                      <span className="text-sm font-bold text-gray-900">Telegram</span>
                      <span className="text-[10px] text-gray-400 ml-1">(EN + FA)</span>
                      <PlatformBadge status={socialJob.telegramStatus} label="" icon={Send} />
                    </div>
                    {/* EN */}
                    <div className="px-4 pt-3 pb-1">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">🇨🇦 English</span>
                    </div>
                    <textarea rows={5} className="w-full px-4 pb-2 text-sm text-gray-700 focus:outline-none resize-y"
                      value={telegramEN}
                      onChange={(e) => setEditForms({ ...editForms, telegram: `${e.target.value}\n\n---\n\n${telegramFA}` })} />
                    {/* FA */}
                    <div className="border-t border-dashed border-[#e5e7eb] px-4 pt-3 pb-1">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">🇮🇷 Persian / فارسی</span>
                    </div>
                    <textarea rows={5} className="w-full px-4 pb-4 text-sm text-gray-700 focus:outline-none resize-y text-right" dir="rtl"
                      value={telegramFA}
                      onChange={(e) => setEditForms({ ...editForms, telegram: `${telegramEN}\n\n---\n\n${e.target.value}` })} />
                  </div>

                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
