"use client";

import { useState } from "react";
import { format } from "date-fns";
import { igniteSocialEngine, updateSocialJob } from "@/actions/social.actions";
import { 
  Play, Share2, CheckCircle2, AlertCircle, RefreshCcw, 
  Linkedin, Twitter, Send, Save, Loader2, Link2, Sparkles
} from "lucide-react";

export default function SocialHubClient({ initialPosts }: { initialPosts: any[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedPost = posts.find(p => p.id === selectedPostId);
  const socialJob = selectedPost?.socialJobs?.[0];

  const [editForms, setEditForms] = useState({
    linkedin: "", x: "", telegram: ""
  });

  // Load drafts into form when a post is clicked
  const handleSelectPost = (id: string) => {
    setSelectedPostId(id);
    const post = posts.find(p => p.id === id);
    const job = post?.socialJobs?.[0];
    if (job) {
       setEditForms({
         linkedin: job.linkedinCopy || "",
         x: job.twitterCopy || "",
         telegram: job.telegramCopy || ""
       });
    } else {
       setEditForms({ linkedin: "", x: "", telegram: "" });
    }
  };

  const handleIgniteEngine = async (postId: string) => {
    setLoading(true); setError(""); setSuccess("");
    try {
      if (!confirm("This will execute the 4-Layer Content Sequencer. Continue?")) { setLoading(false); return; }
      await igniteSocialEngine(postId);
      setSuccess("4-Layer Engine Completed Successfully!");
      setTimeout(() => window.location.reload(), 1500); // Quick refresh to grab new JSON from DB
    } catch (e: any) {
      setError(e.message || "Failed to ignite the semantic engine.");
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
         status: "APPROVED"
      });
      setSuccess("Drafts Approved & Locked to Database.");
      setPosts(posts.map(p => {
        if (p.id === selectedPostId) {
           p.socialJobs[0] = { ...p.socialJobs[0], linkedinCopy: editForms.linkedin, twitterCopy: editForms.x, telegramCopy: editForms.telegram, status: "APPROVED" };
        }
        return p;
      }));
    } catch(e: any) {
      setError(e.message || "Failed to approve save state.");
    } finally {
      setLoading(false);
    }
  };

  let parsedHooks: string[] = [];
  let parsedCtas: string[] = [];
  try {
     if (socialJob?.hooks) parsedHooks = JSON.parse(socialJob.hooks);
     if (socialJob?.ctas) parsedCtas = JSON.parse(socialJob.ctas);
  } catch(e) {}

  return (
    <div className="w-full flex flex-col xl:flex-row gap-6">
      
      {/* LEFT COLUMN: ARTICLE FEED */}
      <div className="xl:w-1/3 flex flex-col gap-6">
         <div className="bg-white border border-[#f5ecd8] p-5 rounded-2xl flex flex-col min-h-[600px] shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest border-b border-[#f5ecd8] pb-3 mb-4">
               Published CMS Articles
            </h3>
            <div className="flex flex-col gap-3 overflow-y-auto pr-2">
               {posts.map(post => {
                  const job = post.socialJobs?.[0];
                  let badge = <span className="text-[10px] bg-gray-100 text-gray-500 font-bold px-2 py-0.5 rounded border border-gray-200">NO SOCIALS GENERATED</span>;
                  if (job?.status === "REVIEW") badge = <span className="text-[10px] bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded border border-blue-200">PENDING REVIEW</span>;
                  if (job?.status === "APPROVED") badge = <span className="text-[10px] bg-green-50 text-green-600 font-bold px-2 py-0.5 rounded border border-green-200 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> APPROVED TO POST</span>;
                  
                  return (
                    <button 
                       key={post.id} 
                       onClick={() => handleSelectPost(post.id)}
                       className={`w-full text-left p-4 rounded-xl border transition-all ${selectedPostId === post.id ? "bg-[#FDFCFB] border-[#C29967] shadow-sm" : "bg-white border-[#f5ecd8] hover:bg-gray-50"}`}
                    >
                       <h4 className={`text-sm font-bold line-clamp-2 ${selectedPostId === post.id ? "text-[#C29967]" : "text-gray-900"}`}>{post.title}</h4>
                       <div className="mt-2">{badge}</div>
                    </button>
                  );
               })}
            </div>
         </div>
      </div>

      {/* RIGHT COLUMN: DISTRIBUTION ENGINE WORKSPACE */}
      <div className="xl:w-2/3 flex flex-col gap-6">
         
         {!selectedPost ? (
            <div className="bg-white border border-[#f5ecd8] rounded-2xl flex items-center justify-center p-12 min-h-[600px] shadow-sm flex-col">
               <Share2 className="w-12 h-12 text-gray-300 mb-4" />
               <p className="text-gray-500 font-bold text-center">Select an article from the left column to ignite its Distribution sequence.</p>
            </div>
         ) : (
            <div className="bg-white border border-[#f5ecd8] rounded-2xl overflow-hidden shadow-sm flex flex-col h-full min-h-[700px]">
               
               {/* Header Panel */}
               <div className="bg-[#FDFCFB] border-b border-[#f5ecd8] p-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <div>
                     <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-white border border-[#f5ecd8] px-2 py-1 rounded inline-block mb-2">Selected Subject</span>
                     <h2 className="text-lg font-black text-gray-900">{selectedPost.title}</h2>
                     <a href={`/blog/${selectedPost.slug}`} target="_blank" className="text-[11px] text-blue-600 font-bold flex items-center gap-1 mt-1 hover:underline">
                        <Link2 className="w-3 h-3" /> verixa.ca/blog/{selectedPost.slug}
                     </a>
                  </div>
                  
                  {!socialJob && (
                     <button onClick={() => handleIgniteEngine(selectedPost.id)} disabled={loading} className="bg-[#111111] hover:bg-black text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50 shrink-0 shadow-lg">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Ignite Sequence
                     </button>
                  )}
                  {socialJob && (
                     <button onClick={handleApprovePayload} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50 shrink-0 shadow-lg shadow-green-600/20">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Approve Formats
                     </button>
                  )}
               </div>

               {/* Notifications */}
               {error && <div className="bg-red-50 text-red-600 p-4 border-b border-red-100 text-sm font-bold">{error}</div>}
               {success && <div className="bg-green-50 text-green-600 p-4 border-b border-green-100 text-sm font-bold">{success}</div>}

               {/* The Workspace */}
               <div className="p-6 flex-1 overflow-y-auto bg-gray-50/30">
                  
                  {!socialJob && !loading && (
                     <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 max-w-sm mx-auto gap-4">
                        <Sparkles className="w-12 h-12 text-gray-300" />
                        <p className="text-sm leading-relaxed">This article has not been distributed yet. Ignite the 4-layer Sequence to generate its unique psychological Hooks, Summary Data, and Platform Copies.</p>
                     </div>
                  )}

                  {loading && !socialJob && (
                     <div className="flex flex-col items-center justify-center h-full text-center text-blue-600 max-w-sm mx-auto gap-4 animate-pulse">
                        <Loader2 className="w-12 h-12 animate-spin" />
                        <p className="text-sm font-bold">Executing Mother Prompt... Compiling strict outputs for LinkedIn, X, and Telegram simultaneously...</p>
                     </div>
                  )}

                  {socialJob && (
                     <div className="flex flex-col gap-8">
                        
                        {/* THE HOOKS ROW */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 scale-95 origin-top">
                           <div className="bg-white border border-[#f5ecd8] p-5 rounded-xl shadow-sm">
                              <h4 className="text-[11px] font-black uppercase tracking-widest text-[#C29967] mb-3 border-b border-[#f5ecd8] pb-2">Psychological Hooks (5)</h4>
                              <ul className="list-decimal list-inside space-y-2 text-[11px] text-gray-600 font-medium">
                                 {parsedHooks.length > 0 ? parsedHooks.map((h, i) => <li key={i} className="hover:text-gray-900 transition-colors p-1">{h}</li>) : <li>No hooks generated.</li>}
                              </ul>
                           </div>
                           <div className="bg-white border border-[#f5ecd8] p-5 rounded-xl shadow-sm">
                              <h4 className="text-[11px] font-black uppercase tracking-widest text-blue-500 mb-3 border-b border-[#f5ecd8] pb-2">Call-to-Action Variations (3)</h4>
                              <ul className="list-decimal list-inside space-y-2 text-[11px] text-gray-600 font-medium">
                                 {parsedCtas.length > 0 ? parsedCtas.map((c, i) => <li key={i} className="hover:text-gray-900 transition-colors p-1">{c}</li>) : <li>No CTAs generated.</li>}
                              </ul>
                           </div>
                        </div>

                        {/* PLATFORM EDITORS */}
                        <div className="grid grid-cols-1 gap-6">
                           
                           <div className="bg-white border border-[#f5ecd8] rounded-xl overflow-hidden shadow-sm">
                              <div className="bg-blue-50/50 p-3 flex items-center gap-2 border-b border-[#f5ecd8]">
                                 <Linkedin className="w-5 h-5 text-blue-600" /> <span className="text-sm font-bold text-gray-900">LinkedIn Post</span>
                                 <span className="text-[10px] text-gray-500 ml-auto">Target: Thought Leadership / Professional</span>
                              </div>
                              <textarea 
                                 rows={8}
                                 className="w-full p-4 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C29967]/20 border-0 resize-y"
                                 value={editForms.linkedin}
                                 onChange={e => setEditForms({...editForms, linkedin: e.target.value})}
                              />
                           </div>

                           <div className="bg-white border border-[#f5ecd8] rounded-xl overflow-hidden shadow-sm">
                              <div className="bg-gray-50 p-3 flex items-center gap-2 border-b border-[#f5ecd8]">
                                 <Twitter className="w-5 h-5 text-gray-900" /> <span className="text-sm font-bold text-gray-900">X (Twitter) Draft</span>
                                 <span className="text-[10px] text-gray-500 ml-auto leading-none">Limit: 280 Chars • <span className={editForms.x?.length > 280 ? 'text-red-500 font-bold' : 'text-green-500 font-bold'}>{editForms.x?.length} char</span></span>
                              </div>
                              <textarea 
                                 rows={4}
                                 className={`w-full p-4 text-sm text-gray-700 focus:outline-none border-0 resize-y ${editForms.x?.length > 280 ? 'bg-red-50/30' : ''}`}
                                 value={editForms.x}
                                 onChange={e => setEditForms({...editForms, x: e.target.value})}
                              />
                           </div>

                           <div className="bg-white border border-[#f5ecd8] rounded-xl overflow-hidden shadow-sm">
                              <div className="bg-blue-400/5 p-3 flex items-center gap-2 border-b border-[#f5ecd8]">
                                 <Send className="w-5 h-5 text-blue-500" /> <span className="text-sm font-bold text-gray-900">Telegram Blast</span>
                                 <span className="text-[10px] text-gray-500 ml-auto">Target: Fast Scanning / Summary</span>
                              </div>
                              <textarea 
                                 rows={5}
                                 className="w-full p-4 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C29967]/20 border-0 resize-y"
                                 value={editForms.telegram}
                                 onChange={e => setEditForms({...editForms, telegram: e.target.value})}
                              />
                           </div>

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
