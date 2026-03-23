"use client";

import { useState } from "react";
import { generateBrief, generateArticle, generateSocials, generateEditorialImage, publishDraftToCMS, processMidRollImages } from "@/actions/ai-blog.actions";
import { Sparkles, ArrowRight, CheckCircle2, Loader2, Image as ImageIcon, Send, Save } from "lucide-react";
import Link from "next/link";

const CATEGORIES = [
  { value: "IMMIGRATION_GUIDES", label: "Immigration Guides" },
  { value: "CONSULTANT_INSIGHTS", label: "Consultant Insights" },
  { value: "CASE_BASED_CONTENT", label: "Case-Based Content" },
  { value: "UPDATES_POLICY", label: "Updates & Policy" },
];

export default function AIFactoryWizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1 State
  const [inputs, setInputs] = useState({
    topic: "How to Choose an Immigration Consultant in 2026",
    keyword: "licensed immigration consultant canada",
    audience: "Newcomers looking to avoid fraud and hire verified professionals",
    category: "CONSULTANT_INSIGHTS"
  });

  // Step 2 State (The Brief)
  const [brief, setBrief] = useState<any>(null);

  // Step 3 State (The Assets)
  const [articleMarkdown, setArticleMarkdown] = useState("");
  const [editorialImage, setEditorialImage] = useState("");
  const [socials, setSocials] = useState<any>(null);

  // STEP 1: Generate Brief
  const handleGenerateBrief = async () => {
    if (!inputs.topic || !inputs.keyword) return setError("Topic and Keyword required.");
    setLoading(true); setError("");
    try {
      const b = await generateBrief(inputs);
      setBrief(b);
      setStep(2);
    } catch (e: any) {
      setError(e.message || "Failed to generate brief via GPT-4o.");
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Generate Content & Imagery Pipeline
  const handleGenerateAssets = async () => {
    setLoading(true); setError("");
    try {
      // Run generation in parallel chunks to save time (Pipeline Orchestration)
      const [mk, soc, img] = await Promise.all([
        generateArticle(brief).then(mk => processMidRollImages(mk || "")),
        generateSocials(brief.summary), // we pass the summary/brief context
        generateEditorialImage(brief.imagePrompt)
      ]);
      
      setArticleMarkdown(mk || "");
      setSocials(soc);
      setEditorialImage(img);
      setStep(3);
    } catch (e: any) {
      setError("AI Generation Failure: " + (e.message || "Pipeline interrupted."));
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: Approval & CMS Injection
  const handleApproveAndPublish = async () => {
    setLoading(true); setError("");
    try {
      const payload = {
        title: brief.title,
        slug: String(brief.slug).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        summary: brief.summary,
        content: articleMarkdown,
        category: inputs.category,
        coverImage: editorialImage,
        metaTitle: brief.metaTitle,
        metaDesc: brief.metaDesc,
        imagePrompt: brief.imagePrompt,
        socialHooks: socials
      };
      await publishDraftToCMS(payload);
      setStep(4);
    } catch (e: any) {
      setError(e.message || "Failed to finalize database commit.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      
      {/* HEADER PROGRESS */}
      <div className="bg-[#161616] border-b border-gray-800 p-4 shrink-0 flex items-center justify-between">
         <div className="flex gap-2 items-center">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className="flex items-center gap-2">
                 <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${step >= s ? 'bg-[#C29967] border-[#C29967] text-white' : 'bg-gray-900 border-gray-800 text-gray-500'}`}>
                   {s < step ? <CheckCircle2 className="w-4 h-4" /> : s}
                 </div>
                 {s < 4 && <div className={`w-8 h-px ${step > s ? 'bg-[#C29967]' : 'bg-gray-800'}`}></div>}
              </div>
            ))}
         </div>
         {loading && <div className="text-[#C29967] text-sm font-bold flex items-center gap-2 animate-pulse"><Loader2 className="w-4 h-4 animate-spin" /> Neural Engine Active...</div>}
      </div>

      <div className="flex-1 overflow-y-auto p-8 relative">
        {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl font-bold text-sm">{error}</div>}

        {/* ======================= STEP 1: INPUT ======================= */}
        {step === 1 && (
          <div className="max-w-2xl mx-auto space-y-6">
             <div className="text-center mb-8">
               <h2 className="text-2xl font-serif text-white font-bold mb-2">Initialize SEO Strategy</h2>
               <p className="text-gray-400 text-sm">Provide the seed variables. GPT-4o will construct the Information Architecture.</p>
             </div>
             
             <div className="space-y-4 bg-[#161616] border border-gray-800 p-6 rounded-2xl">
               <div>
                 <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Target Topic</label>
                 <input type="text" value={inputs.topic} onChange={e => setInputs({...inputs, topic: e.target.value})} className="w-full bg-[#1A1A1A] border border-gray-800 p-3 rounded-lg text-white" />
               </div>
               <div>
                 <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Primary Keyword (Exact Match)</label>
                 <input type="text" value={inputs.keyword} onChange={e => setInputs({...inputs, keyword: e.target.value})} className="w-full bg-[#1A1A1A] border border-gray-800 p-3 rounded-lg text-[#C29967] font-mono" />
               </div>
               <div>
                 <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Target Audience & Intent</label>
                 <input type="text" value={inputs.audience} onChange={e => setInputs({...inputs, audience: e.target.value})} className="w-full bg-[#1A1A1A] border border-gray-800 p-3 rounded-lg text-gray-300" />
               </div>
               <div>
                 <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">SEO Category Pillar</label>
                 <select value={inputs.category} onChange={e => setInputs({...inputs, category: e.target.value})} className="w-full bg-[#1A1A1A] border border-gray-800 p-3 rounded-lg text-white">
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                 </select>
               </div>
             </div>

             <button onClick={handleGenerateBrief} disabled={loading} className="w-full bg-[#C29967] hover:bg-[#b08856] text-white p-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(194,153,103,0.3)] disabled:opacity-50">
               Generate Content Brief <Sparkles className="w-5 h-5" />
             </button>
          </div>
        )}

        {/* ======================= STEP 2: BRIEF REVIEW ======================= */}
        {step === 2 && brief && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="text-center mb-6">
               <h2 className="text-2xl font-serif text-white font-bold mb-2">Strategy Verification (Gate 1)</h2>
               <p className="text-gray-400 text-sm">Review the GPT-4o Information Architecture. If approved, the Multi-Agent Pipeline will execute the final assets.</p>
             </div>

             <div className="bg-[#161616] border border-gray-800 p-6 rounded-2xl space-y-6">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">H1 Title</label>
                  <input type="text" value={brief.title} onChange={e => setBrief({...brief, title: e.target.value})} className="w-full bg-transparent border-b border-gray-700 p-2 text-xl font-serif font-bold text-white focus:outline-none" />
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                   <div>
                     <label className="text-xs font-bold text-gray-500 uppercase block mb-1">URL Slug</label>
                     <input type="text" value={brief.slug} onChange={e => setBrief({...brief, slug: e.target.value})} className="w-full bg-[#1A1A1A] border border-gray-800 p-2 rounded text-sm text-gray-300" />
                   </div>
                   <div>
                     <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Writer Angle</label>
                     <input type="text" value={brief.angle} onChange={e => setBrief({...brief, angle: e.target.value})} className="w-full bg-[#1A1A1A] border border-gray-800 p-2 rounded text-sm text-[var(--color-teal)]" />
                   </div>
                </div>

                <div>
                   <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Article Outline (H2s)</label>
                   <div className="flex flex-col gap-2">
                     {brief.outline.map((o: string, i: number) => (
                        <div key={i} className="bg-[#1A1A1A] border border-gray-800 p-3 rounded text-sm text-gray-300 flex items-center gap-3">
                           <span className="text-gray-600 font-mono">0{i+1}</span> {o}
                        </div>
                     ))}
                   </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">DALL-E / FAL Image Prompt Generator</label>
                  <textarea value={brief.imagePrompt} onChange={e => setBrief({...brief, imagePrompt: e.target.value})} rows={2} className="w-full bg-[#1A1A1A] border border-gray-800 p-3 rounded text-sm text-[#C29967] resize-none" />
                </div>
             </div>

             <div className="flex gap-4 pt-4 border-t border-gray-800">
                <button onClick={() => setStep(1)} className="px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl transition-colors">Discard</button>
                <button onClick={handleGenerateAssets} disabled={loading} className="flex-1 bg-white hover:bg-gray-100 text-black px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                  Approve Brief & Initiate Asset Pipeline <ArrowRight className="w-4 h-4" />
                </button>
             </div>
          </div>
        )}

        {/* ======================= STEP 3: ASSET REVIEW ======================= */}
        {step === 3 && (
          <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
             <div className="flex justify-between items-end mb-6">
                <div>
                  <h2 className="text-2xl font-serif text-white font-bold mb-2">Pipeline Compilation Complete</h2>
                  <p className="text-gray-400 text-sm">Review the native Markdown, Editorial Image, and Social Hooks before committing to the CMS.</p>
                </div>
                <button onClick={handleApproveAndPublish} disabled={loading} className="bg-[#C29967] hover:bg-[#b08856] text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(194,153,103,0.3)]">
                  Save Output to Verixa DB <Save className="w-4 h-4" />
                </button>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[800px]">
                {/* Visuals & Socials */}
                <div className="space-y-6 flex flex-col h-full overflow-y-auto">
                   
                   {/* FAL Image */}
                   <div className="bg-[#161616] border border-gray-800 p-4 rounded-2xl shrink-0">
                     <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><ImageIcon className="w-4 h-4" /> FAL.AI FLUX PRO (Featured Image)</h3>
                     {editorialImage ? (
                        <div className="aspect-[16/9] bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
                          <img src={editorialImage} alt="Generated" className="w-full h-full object-cover" />
                        </div>
                     ) : (
                        <div className="aspect-[16/9] bg-red-500/10 rounded-xl border border-red-500/20 flex items-center justify-center text-red-500 text-xs font-bold">Image Gen Failed. Proceeding without hero.</div>
                     )}
                   </div>

                   {/* Social Variants */}
                   <div className="bg-[#161616] border border-gray-800 p-4 rounded-2xl flex-1 flex flex-col">
                     <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><Send className="w-4 h-4" /> Social Repurposing Engine</h3>
                     <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                        {socials ? (
                          <>
                            <div className="p-3 bg-blue-900/10 border border-blue-900/30 rounded-lg">
                               <p className="text-[10px] font-black text-blue-400 mb-1">LINKEDIN</p>
                               <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{socials.linkedin}</p>
                            </div>
                            <div className="p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg">
                               <p className="text-[10px] font-black text-gray-400 mb-1">X / TWITTER</p>
                               <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{socials.twitter}</p>
                            </div>
                            <div className="p-3 bg-pink-900/10 border border-pink-900/30 rounded-lg">
                               <p className="text-[10px] font-black text-pink-400 mb-1">INSTAGRAM CAPTION</p>
                               <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{socials.instagram}</p>
                            </div>
                          </>
                        ) : (
                           <div className="text-sm text-gray-500 italic p-4">Social extraction malfunction...</div>
                        )}
                     </div>
                   </div>

                </div>

                {/* Markdown Code Edit */}
                <div className="lg:col-span-2 bg-[#161616] border border-gray-800 p-4 rounded-2xl flex flex-col h-full">
                   <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Raw Markdown (AEO Evaluated)</h3>
                   <textarea 
                     value={articleMarkdown} 
                     onChange={(e) => setArticleMarkdown(e.target.value)} 
                     className="w-full flex-1 bg-[#1A1A1A] border border-gray-800 rounded-xl p-6 text-gray-300 font-mono text-sm leading-relaxed resize-none focus:outline-none focus:border-[#C29967]"
                   />
                </div>
             </div>
          </div>
        )}

        {/* ======================= STEP 4: SUCCESS ======================= */}
        {step === 4 && (
          <div className="flex flex-col items-center justify-center space-y-4 h-full animate-in zoom-in slide-in-from-bottom-10 duration-700">
             <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center border border-green-500/20">
               <CheckCircle2 className="w-10 h-10" />
             </div>
             <h2 className="text-3xl font-serif text-white font-bold">Safely Acquired!</h2>
             <p className="text-gray-400 max-w-md text-center">
               The pipeline is fully complete. The AEO structural markdown, FAL AI image, and dynamic Social Hooks have been safely written to the SQLite CMS as a Draft.
             </p>
             <div className="pt-6 flex gap-4">
                <button onClick={() => setStep(1)} className="px-6 py-2 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-lg border border-gray-800">New Campaign</button>
                <Link href="/dashboard/admin/blog" className="px-6 py-2 bg-[#C29967] hover:bg-[#b08856] text-white font-bold rounded-lg">View CMS Library</Link>
             </div>
          </div>
        )}

      </div>
    </div>
  );
}


