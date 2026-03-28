"use client";

import { useState } from "react";
import { format } from "date-fns";
import { syncContentSource, processPendingRawArticle, addSource, deleteSource, executeAutoPilot } from "@/actions/aggregator.actions";
import { 
  Plus, Rss, Loader2, Play, Database, 
  CheckCircle2, AlertCircle, RefreshCcw, FileText, ArrowRight, Sparkles, Trash2
} from "lucide-react";
import Link from "next/link";

export default function NewsAggregatorClient({ initialSources, initialQueue }: { initialSources: any[], initialQueue: any[] }) {
  const [sources, setSources] = useState(initialSources);
  const [queue, setQueue] = useState(initialQueue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [newSource, setNewSource] = useState({ name: "", url: "", type: "RSS" });

  const handleAddSource = async () => {
    if (!newSource.name || !newSource.url) return;
    setLoading(true); setError(""); setSuccess("");
    try {
      const res = await addSource(newSource);
      if (!res.success) {
        setError(res.message);
        return;
      }
      setSources([res.source, ...sources]);
      setNewSource({ name: "", url: "", type: "RSS" });
      setSuccess(res.message);
    } catch (e: any) {
      setError(e.message || "Failed to register source.");
    } finally {
      setLoading(false);
    }
  };

  const [syncLimit, setSyncLimit] = useState<number>(5);

  const handleSyncSource = async (sourceId: string) => {
    setLoading(true); setError(""); setSuccess("");
    try {
      const res = await syncContentSource(sourceId, syncLimit);
      if (!res.success) {
        setError(res.message);
        alert(`Sync Failed: ${res.message}`);
        return;
      }
      setSuccess(res.message);
      alert(res.message);
    } catch (e: any) {
      setError(e.message || "Failed to sync source.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    if (!confirm("Terminate this source node and all its raw article associations?")) return;
    setLoading(true); setError(""); setSuccess("");
    try {
      const res = await deleteSource(sourceId);
      if (!res.success) {
        setError(res.message);
        return;
      }
      setSources(sources.filter(s => s.id !== sourceId));
      setSuccess("Source Node Terminated.");
    } catch (e: any) {
      setError(e.message || "Failed to terminate node.");
    } finally {
      setLoading(false);
    }
  };

  const handleProcessArticle = async (rawArticleId: string) => {
    setLoading(true); setError(""); setSuccess("");
    try {
      const res = await processPendingRawArticle(rawArticleId);
      if (!res.success) {
         setError(res.message);
         setQueue(queue.map(q => q.id === rawArticleId ? { ...q, status: "FAILED" } : q));
         return;
      }
      setSuccess(res.message);
      
      // Update local state queue
      setQueue(queue.map(q => q.id === rawArticleId ? { ...q, status: res.status } : q));
    } catch (e: any) {
      setError(e.message || "Pipeline crashed.");
      setQueue(queue.map(q => q.id === rawArticleId ? { ...q, status: "FAILED" } : q));
    } finally {
      setLoading(false);
    }
  };

  const handleAutoPilot = async () => {
    if (!confirm(`Deploy Autonomous Generator? This will automatically find the ${syncLimit} latest articles from ALL Active Sources, regenerate them with AI, drop in infographics, and PUBLISH THEM LIVE immediately.`)) return;
    
    setLoading(true); setError(""); setSuccess("");
    try {
      const res = await executeAutoPilot(syncLimit);
      if (!res.success) {
        setError(res.message);
        alert(`Sequence Failed: ${res.message}`);
        return;
      }
      setSuccess(res.message);
      alert(res.message);
      setTimeout(() => window.location.reload(), 2000);
    } catch (e: any) {
      setError(e.message || "Auto-pilot sequence failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col xl:flex-row gap-6">
      
      {/* LEFT COLUMN: SOURCES */}
      <div className="xl:w-1/3 flex flex-col gap-6">
         
         <div className="bg-[#0F2A44] border border-gray-800 p-6 rounded-2xl flex flex-col gap-4 shadow-xl">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest border-b border-gray-800 pb-3 flex flex-col gap-4">
               <div className="flex items-center gap-2">
                 <Database className="w-4 h-4 text-[#2FA4A9]" /> Source Registry
               </div>
               <div className="flex bg-[#0a1f33] border-gray-800 border p-1 rounded-xl text-xs font-bold font-mono">
                  <button 
                    className={`flex-1 py-2 rounded-lg transition-all ${newSource.type === 'RSS' ? 'bg-[#2FA4A9] text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}
                    onClick={() => setNewSource({...newSource, type: "RSS"})}>
                    XML Feed (RSS)
                  </button>
                  <button 
                    className={`flex-1 py-2 rounded-lg transition-all ${newSource.type === 'WEB_SCRAPE' ? 'bg-[#2FA4A9] text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}
                    onClick={() => setNewSource({...newSource, type: "WEB_SCRAPE"})}>
                    HTML Web Scraper
                  </button>
               </div>
               <input 
                  className="w-full bg-[#0a1f33] border border-gray-800 text-white rounded-xl p-3 text-sm font-mono placeholder-gray-600 focus:outline-none focus:border-[#2FA4A9]"
                  placeholder="Source Name (e.g. CIC News)"
                  value={newSource.name}
                  onChange={e => setNewSource({...newSource, name: e.target.value})}
               />
               <input 
                  className="w-full bg-[#0a1f33] border border-gray-800 text-white rounded-xl p-3 text-sm font-mono placeholder-gray-600 focus:outline-none focus:border-[#2FA4A9]"
                  placeholder={`URL (${newSource.type === 'RSS' ? 'RSS/XML' : 'Main Page /news'})`}
                  value={newSource.url}
                  onChange={e => setNewSource({...newSource, url: e.target.value})}
               />
               <button onClick={handleAddSource} disabled={loading} className="bg-white hover:bg-gray-100 text-black p-3 rounded-lg font-bold flex items-center justify-center gap-2">
                 Register Oracle <Plus className="w-4 h-4" />
               </button>
            </h3>
            
            {error && <div className="text-red-500 text-xs font-bold mt-2">{error}</div>}
            {success && <div className="text-green-500 text-xs font-bold mt-2">{success}</div>}
         </div>

         <div className="bg-[#0F2A44] border border-gray-800 p-6 rounded-2xl flex flex-col flex-1 shadow-xl min-h-[400px]">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest border-b border-gray-800 pb-3 mb-4">
               Active Nodes
            </h3>
            <div className="flex flex-col gap-3 overflow-y-auto pr-2">
               {sources.map(src => (
                  <div key={src.id} className="bg-[#0F2A44] border border-gray-800 p-4 rounded-xl flex flex-col gap-3">
                     <div className="flex justify-between items-start">
                        <div>
                           <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                {src.type === "RSS" ? <Rss className="w-3 h-3 text-orange-400" /> : <Database className="w-3 h-3 text-purple-400" />}
                                {src.name}
                              </h4>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-bold">{src.type}</span>
                           </div>
                           <p className="text-[10px] text-gray-500 font-mono mt-1 break-all">{src.url}</p>
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="text-[10px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded font-bold border border-green-500/20">ACTIVE</div>
                           <button onClick={() => handleDeleteSource(src.id)} disabled={loading} className="text-red-500 hover:bg-red-500/20 p-1 rounded transition-colors" title="Delete Source Node">
                              <Trash2 className="w-3 h-3" />
                           </button>
                        </div>
                     </div>
                     <div className="flex gap-2 mt-2">
                        <input 
                           type="number" 
                           min="1" 
                           max="20" 
                           value={syncLimit} 
                           onChange={e => setSyncLimit(Number(e.target.value))} 
                           className="bg-[#0F2A44] border border-gray-800 rounded-lg text-center text-white text-xs w-16"
                           title="Max items to process"
                        />
                        <button onClick={() => handleSyncSource(src.id)} disabled={loading} className="w-full bg-[#2FA4A9]/10 hover:bg-[#2FA4A9]/20 border border-[#2FA4A9]/30 text-[#2FA4A9] p-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors">
                           Force Sync Crawl <RefreshCcw className="w-3 h-3" />
                        </button>
                     </div>
                  </div>
               ))}
               {sources.length === 0 && <p className="text-xs text-gray-500 text-center italic mt-4">No sources configured.</p>}
            </div>
         </div>

      </div>

      {/* RIGHT COLUMN: THE EXTRACTION QUEUE */}
      <div className="xl:w-2/3 flex flex-col gap-6">

         {/* 1-CLICK AUTO PILOT MEGA COMMAND */}
         <div className="bg-gradient-to-r from-[#2FA4A9] to-blue-600 p-[1px] rounded-2xl shadow-xl hover:shadow-[0_0_30px_-5px_#2FA4A9] transition-all">
           <div className="bg-[#0a1f33] rounded-2xl p-6 px-8 flex flex-col md:flex-row gap-6 md:gap-0 items-center justify-between">
              <div>
                 <h2 className="text-xl font-black text-white flex items-center gap-3">
                    <Sparkles className="w-6 h-6 text-yellow-400" /> Deploy Autonomous Auto-Pilot
                 </h2>
                 <p className="text-xs text-blue-200/70 mt-2 max-w-xl font-mono leading-relaxed">
                    [OVERRIDE PROTOCOL] Sequentially syncs the latest <strong>{syncLimit}</strong> links from ALL configured Nodes, generates premium AEO articles (embedded with professional Markdown Data Tables & Images), and <strong>PUBLISHES THEM LIVE</strong> instantly.
                 </p>
              </div>
              <button 
                 onClick={handleAutoPilot} 
                 disabled={loading} 
                 className="font-extrabold shadow-lg bg-gradient-to-r hover:bg-gradient-to-l from-[#2FA4A9] to-blue-500 text-white px-8 py-4 rounded-xl flex items-center gap-3 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 whitespace-nowrap">
                 {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Play className="w-5 h-5 fill-current" />} RUN SEQUENCE
              </button>
           </div>
         </div>

         <div className="bg-[#0F2A44] border border-gray-800 rounded-2xl flex flex-col shadow-xl overflow-hidden min-h-[600px]">
         <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-[#0F2A44]">
            <div>
               <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                  <Play className="w-4 h-4 text-blue-400" /> 6-Layer Orchestrator Queue
               </h3>
               <p className="text-[11px] text-gray-500 mt-1">Pending items indicate URLs extracted via Sync ready to be run through the Intelligence Layers.</p>
            </div>
            {loading && <div className="text-blue-400 text-xs font-bold flex items-center gap-2 animate-pulse"><Loader2 className="w-4 h-4 animate-spin" /> GPT-4o Online...</div>}
         </div>
         
         <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#0F2A44] sticky top-0 z-10 border-b border-gray-800 shadow-sm">
                <tr>
                  <th className="p-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider w-[50%]">Raw Source Article</th>
                  <th className="p-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Node</th>
                  <th className="p-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Engine State</th>
                  <th className="p-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Execute</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm">
                {queue.length === 0 ? (
                   <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500 text-xs font-mono">
                         Global Queue Empty. Trigger a Sync Crawl on a Source Node.
                      </td>
                   </tr>
                ) : (
                   queue.map(q => (
                      <tr key={q.id} className="hover:bg-[#0F2A44] transition-colors group">
                        <td className="p-4">
                           <div className="font-bold text-gray-200 line-clamp-2">{q.title}</div>
                           <a href={q.sourceUrl} target="_blank" className="text-[10px] text-gray-500 mt-1 hover:text-[#2FA4A9] transition-colors flex items-center gap-1">
                             Verify URL <ArrowRight className="w-3 h-3" />
                           </a>
                        </td>
                        <td className="p-4">
                           <span className="text-[10px] font-bold uppercase tracking-wider text-[#2FA4A9] bg-[#2FA4A9]/10 border border-[#2FA4A9]/20 px-2 py-1 rounded line-clamp-1">
                             {q.source?.name}
                           </span>
                        </td>
                        <td className="p-4 text-center">
                           {q.status === "PENDING" && <span className="text-orange-400 font-bold text-[10px] bg-orange-400/10 px-2 py-1 rounded">PENDING</span>}
                           {q.status === "GENERATING" && <span className="text-blue-400 font-bold text-[10px] bg-blue-400/10 px-2 py-1 rounded flex items-center gap-1 justify-center"><Loader2 className="w-3 h-3 animate-spin" /> GENERATING</span>}
                           {q.status === "PROCESSED" && <span className="text-green-500 font-bold text-[10px] bg-green-500/10 px-2 py-1 rounded flex items-center gap-1 justify-center"><CheckCircle2 className="w-3 h-3" /> SUCCESS</span>}
                           {q.status === "DUPLICATE" && <span className="text-gray-500 font-bold text-[10px] bg-gray-800 px-2 py-1 rounded">REJECTED (DUPE/NOISE)</span>}
                           {q.status === "FAILED" && <span className="text-red-500 font-bold text-[10px] bg-red-500/10 px-2 py-1 rounded flex items-center gap-1 justify-center"><AlertCircle className="w-3 h-3" /> FAILED</span>}
                        </td>
                        <td className="p-4 text-right">
                           {q.status === "PENDING" || q.status === "FAILED" ? (
                             <button onClick={() => handleProcessArticle(q.id)} disabled={loading} className="text-[11px] font-bold text-blue-400 hover:text-white bg-blue-900/20 hover:bg-blue-600 px-4 py-2 rounded-lg transition-colors border border-blue-900/30">
                               Compile <Sparkles className="w-3 h-3 inline ml-1" />
                             </button>
                           ) : (
                             <Link href="/dashboard/admin/blog" className="text-[11px] font-bold text-gray-400 hover:text-white bg-gray-800 px-4 py-2 rounded-lg transition-colors border border-gray-700">
                               <FileText className="w-3 h-3 inline mr-1" /> View CMS
                             </Link>
                           )}
                        </td>
                      </tr>
                   ))
                )}
              </tbody>
            </table>
         </div>
         </div>

      </div>

    </div>
  );
}
