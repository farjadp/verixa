"use client";

import { useState } from "react";
import { format } from "date-fns";
import { syncContentSource, processPendingRawArticle, addSource } from "@/actions/aggregator.actions";
import { 
  Plus, Rss, Loader2, Play, Database, 
  CheckCircle2, AlertCircle, RefreshCcw, FileText, ArrowRight, Sparkles
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
      const src = await addSource(newSource);
      setSources([src, ...sources]);
      setNewSource({ name: "", url: "", type: "RSS" });
      setSuccess("Source registered.");
    } catch (e: any) {
      setError(e.message || "Failed to register source.");
    } finally {
      setLoading(false);
    }
  };

  const handleSyncSource = async (sourceId: string) => {
    setLoading(true); setError(""); setSuccess("");
    try {
      const res = await syncContentSource(sourceId);
      setSuccess(res.message);
      // Let the UI lag a bit, user should reload page to see the new queue items
    } catch (e: any) {
      setError(e.message || "Failed to sync source.");
    } finally {
      setLoading(false);
    }
  };

  const handleProcessArticle = async (rawArticleId: string) => {
    setLoading(true); setError(""); setSuccess("");
    try {
      const res = await processPendingRawArticle(rawArticleId);
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

  return (
    <div className="w-full flex flex-col xl:flex-row gap-6">
      
      {/* LEFT COLUMN: SOURCES */}
      <div className="xl:w-1/3 flex flex-col gap-6">
         
         <div className="bg-[#0F2A44] border border-gray-800 p-6 rounded-2xl flex flex-col gap-4 shadow-xl">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest border-b border-gray-800 pb-3 flex items-center gap-2">
               <Database className="w-4 h-4 text-[#2FA4A9]" /> Source Registry
            </h3>
            
            <div className="flex flex-col gap-3">
               <input type="text" placeholder="Source Name (e.g. CIC News)" value={newSource.name} onChange={e => setNewSource({...newSource, name: e.target.value})} className="bg-[#0F2A44] border border-gray-800 p-3 rounded-lg text-white" />
               <input type="text" placeholder="Feed URL (RSS/XML)" value={newSource.url} onChange={e => setNewSource({...newSource, url: e.target.value})} className="bg-[#0F2A44] border border-gray-800 p-3 rounded-lg text-gray-400 font-mono text-xs" />
               <button onClick={handleAddSource} disabled={loading} className="bg-white hover:bg-gray-100 text-black p-3 rounded-lg font-bold flex items-center justify-center gap-2">
                 Register Oracle <Plus className="w-4 h-4" />
               </button>
            </div>
            
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
                           <h4 className="text-sm font-bold text-white flex items-center gap-2"><Rss className="w-3 h-3 text-orange-400" /> {src.name}</h4>
                           <p className="text-[10px] text-gray-500 font-mono mt-1 break-all">{src.url}</p>
                        </div>
                        <div className="text-[10px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded font-bold border border-green-500/20">ACTIVE</div>
                     </div>
                     <button onClick={() => handleSyncSource(src.id)} disabled={loading} className="w-full bg-[#2FA4A9]/10 hover:bg-[#2FA4A9]/20 border border-[#2FA4A9]/30 text-[#2FA4A9] p-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors">
                        Force Sync Crawl <RefreshCcw className="w-3 h-3" />
                     </button>
                  </div>
               ))}
               {sources.length === 0 && <p className="text-xs text-gray-500 text-center italic mt-4">No sources configured.</p>}
            </div>
         </div>

      </div>

      {/* RIGHT COLUMN: THE EXTRACTION QUEUE */}
      <div className="xl:w-2/3 bg-[#0F2A44] border border-gray-800 rounded-2xl flex flex-col shadow-xl overflow-hidden min-h-[700px]">
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
  );
}
