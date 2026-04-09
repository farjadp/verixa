"use client";

import { useState } from "react";
import { CheckCircle, XCircle, RefreshCw, AlertTriangle, Building, ArrowRight, Edit2, Save } from "lucide-react";
import { approveAmbiguousMatch, rejectAmbiguousMatch, queueAllCompanies, processNextBatchAction, updateEnrichmentRecord } from "@/actions/enrichment.actions";
import { useRouter } from "next/navigation";

export default function EnrichmentDashboardClient({ initialEnrichments, initialJobs }: { initialEnrichments: any[], initialJobs: any[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("ambiguous");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ matchedLegalName: "", registryNumber: "", jurisdiction: "" });

  const ambiguous = initialEnrichments.filter(e => e.matchStatus === "ambiguous");
  const matched = initialEnrichments.filter(e => e.matchStatus === "matched");
  const failed = initialEnrichments.filter(e => e.matchStatus === "error" || e.matchStatus === "not_found");

  const handleQueueAll = async () => {
    if (!confirm("Are you sure you want to queue all eligible companies?")) return;
    setLoading(true);
    try {
      const res = await queueAllCompanies();
      alert(`Successfully queued ${res.queuedCount} companies!`);
    } catch (err: any) {
      alert("Error: " + err.message);
    }
    setLoading(false);
    router.refresh();
  };

  const handleProcessBatch = async () => {
    setLoading(true);
    try {
      const res = await processNextBatchAction(10);
      alert(`Processed ${res.processed} jobs from the queue.`);
    } catch (err: any) {
      alert("Error: " + err.message);
    }
    setLoading(false);
    router.refresh();
  };

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setLoading(true);
    if (action === 'approve') await approveAmbiguousMatch(id);
    else await rejectAmbiguousMatch(id);
    setLoading(false);
    router.refresh();
  };

  const startEditing = (e: any) => {
    setEditingId(e.id);
    setEditData({
      matchedLegalName: e.matchedLegalName || "",
      registryNumber: e.registryNumber || "",
      jurisdiction: e.jurisdiction || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setLoading(true);
    try {
      await updateEnrichmentRecord(editingId, editData);
      setEditingId(null);
      alert("Record updated successfully!");
    } catch (err: any) {
      alert("Failed to update: " + err.message);
    }
    setLoading(false);
    router.refresh();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-serif text-[#1A1F2B]">Company Enrichment Engine</h1>
          <p className="text-sm text-gray-500 mt-1">Review ambiguous matches and manage background registry jobs.</p>
        </div>
        <div className="flex items-center gap-3">
           <button onClick={handleQueueAll} disabled={loading} className="bg-white border border-[#e5e7eb] px-4 py-2 rounded-lg text-sm font-bold text-gray-600 hover:border-[#2FA4A9] transition-all">
             Queue All Candidates
           </button>
           <button onClick={handleProcessBatch} disabled={loading} className="bg-[#0F2A44] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-black transition-all flex items-center gap-2">
             <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Process Next Batch
           </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-[#e5e7eb] shadow-sm">
           <div className="flex items-center gap-3 text-orange-500 mb-2">
             <AlertTriangle className="w-5 h-5" />
             <h3 className="font-bold">Ambiguous</h3>
           </div>
           <p className="text-3xl font-black text-[#1A1F2B]">{ambiguous.length}</p>
           <p className="text-xs text-gray-500 mt-2">Requires admin review</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#e5e7eb] shadow-sm">
           <div className="flex items-center gap-3 text-green-500 mb-2">
             <CheckCircle className="w-5 h-5" />
             <h3 className="font-bold">Verified Matches</h3>
           </div>
           <p className="text-3xl font-black text-[#1A1F2B]">{matched.length}</p>
           <p className="text-xs text-gray-500 mt-2">Published to profiles</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#e5e7eb] shadow-sm">
           <div className="flex items-center gap-3 text-gray-400 mb-2">
             <Building className="w-5 h-5" />
             <h3 className="font-bold">Not Found / Errors</h3>
           </div>
           <p className="text-3xl font-black text-[#1A1F2B]">{failed.length}</p>
           <p className="text-xs text-gray-500 mt-2">No valid matches found</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#e5e7eb] shadow-sm">
           <div className="flex items-center gap-3 text-blue-500 mb-2">
             <RefreshCw className="w-5 h-5" />
             <h3 className="font-bold">Jobs in Queue</h3>
           </div>
           <p className="text-3xl font-black text-[#1A1F2B]">{initialJobs.filter(j => j.status === 'queued').length}</p>
           <p className="text-xs text-gray-500 mt-2">Pending API checks</p>
        </div>
      </div>

      {/* TABS & TABLE */}
      <div className="bg-white rounded-3xl border border-[#e5e7eb] shadow-sm overflow-hidden">
        <div className="flex items-center gap-6 px-6 pt-6 border-b border-[#e5e7eb]">
           <button 
             onClick={() => setActiveTab('ambiguous')}
             className={`pb-4 text-sm font-bold border-b-2 transition-all ${activeTab === 'ambiguous' ? 'border-[#2FA4A9] text-[#1A1F2B]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
           >
             Ambiguous Matches ({ambiguous.length})
           </button>
           <button 
             onClick={() => setActiveTab('jobs')}
             className={`pb-4 text-sm font-bold border-b-2 transition-all ${activeTab === 'jobs' ? 'border-[#2FA4A9] text-[#1A1F2B]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
           >
             Background Jobs ({initialJobs.length})
           </button>
        </div>
        
        <div className="p-0">
          {activeTab === 'ambiguous' && (
            <table className="w-full text-left text-sm">
               <thead className="bg-[#F5F7FA] text-xs font-bold uppercase tracking-wider text-gray-500">
                 <tr>
                   <th className="px-6 py-4">Consultant Input</th>
                   <th className="px-6 py-4">Extracted Match</th>
                   <th className="px-6 py-4">Score</th>
                   <th className="px-6 py-4 text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-[#e5e7eb]">
                 {ambiguous.length === 0 ? (
                   <tr><td colSpan={4} className="p-8 text-center text-gray-400 italic">No ambiguous matches pending review.</td></tr>
                 ) : ambiguous.map(e => (
                   <tr key={e.id} className="hover:bg-gray-50 border-t border-gray-100">
                     <td className="px-6 py-4 align-top w-1/4">
                        <div className="font-bold text-[#1A1F2B]">{e.rawCompanyName}</div>
                        <div className="text-xs text-gray-500">{e.consultantProfile.fullName} ({e.consultantProfile.province || 'Unknown Prov.'})</div>
                     </td>
                     <td className="px-6 py-4 align-top w-2/4">
                        {editingId === e.id ? (
                          <div className="space-y-3 p-3 bg-white border border-[#e5e7eb] rounded-xl shadow-sm">
                            <div>
                               <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Legal Name</label>
                               <input type="text" value={editData.matchedLegalName} onChange={ev => setEditData({...editData, matchedLegalName: ev.target.value})} className="w-full text-sm font-bold border rounded-md px-3 py-1.5 focus:ring-2 focus:ring-[#2FA4A9] outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Registry Number</label>
                                 <input type="text" value={editData.registryNumber} onChange={ev => setEditData({...editData, registryNumber: ev.target.value})} className="w-full text-sm border rounded-md px-3 py-1.5 focus:ring-2 focus:ring-[#2FA4A9] outline-none" />
                              </div>
                              <div>
                                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Jurisdiction</label>
                                 <input type="text" value={editData.jurisdiction} onChange={ev => setEditData({...editData, jurisdiction: ev.target.value})} className="w-full text-sm border rounded-md px-3 py-1.5 focus:ring-2 focus:ring-[#2FA4A9] outline-none" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="font-bold text-[#2FA4A9] flex items-center gap-2">
                               <ArrowRight className="w-4 h-4 shrink-0" /> {e.matchedLegalName}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                               <span><strong className="text-gray-400 font-medium">Source:</strong> {e.registrySource}</span> 
                               <span><strong className="text-gray-400 font-medium">Jurisdiction:</strong> {e.jurisdiction}</span>
                               <span><strong className="text-gray-400 font-medium">Number:</strong> {e.registryNumber}</span>
                            </div>
                          </>
                        )}
                     </td>
                     <td className="px-6 py-4 align-top">
                        <span className="bg-orange-100 text-orange-700 font-bold px-2 py-1 rounded text-xs">{e.confidenceScore} / 100</span>
                     </td>
                     <td className="px-6 py-4 text-right align-top">
                        {editingId === e.id ? (
                           <div className="flex items-center justify-end gap-2">
                             <button onClick={handleSaveEdit} disabled={loading} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-all" title="Save Changes"><Save className="w-4 h-4" /></button>
                             <button onClick={() => setEditingId(null)} disabled={loading} className="p-2 bg-gray-50 text-gray-500 hover:bg-gray-100 rounded-lg transition-all" title="Cancel"><XCircle className="w-4 h-4" /></button>
                           </div>
                        ) : (
                           <div className="flex items-center justify-end gap-2">
                             <button onClick={() => startEditing(e)} disabled={loading} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Edit Company Details"><Edit2 className="w-4 h-4" /></button>
                             <button onClick={() => handleAction(e.id, 'approve')} disabled={loading} className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-all" title="Approve & Publish"><CheckCircle className="w-4 h-4" /></button>
                           </div>
                        )}
                     </td>
                   </tr>
                 ))}
               </tbody>
            </table>
          )}
          
          {activeTab === 'jobs' && (
            <table className="w-full text-left text-sm">
               <thead className="bg-[#F5F7FA] text-xs font-bold uppercase tracking-wider text-gray-500">
                 <tr>
                   <th className="px-6 py-4">Consultant</th>
                   <th className="px-6 py-4">Company Target</th>
                   <th className="px-6 py-4">Status</th>
                   <th className="px-6 py-4">Attempts</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-[#e5e7eb]">
                 {initialJobs.length === 0 ? (
                   <tr><td colSpan={4} className="p-8 text-center text-gray-400 italic">No jobs in the system.</td></tr>
                 ) : initialJobs.map(j => (
                   <tr key={j.id} className="hover:bg-gray-50">
                     <td className="px-6 py-4">{j.consultantProfile?.fullName}</td>
                     <td className="px-6 py-4 font-medium text-[#1A1F2B]">{j.rawCompanyName}</td>
                     <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${j.status === 'done' ? 'bg-green-100 text-green-700' : j.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                          {j.status.toUpperCase()}
                        </span>
                     </td>
                     <td className="px-6 py-4 text-gray-500">{j.attempts} / 3</td>
                   </tr>
                 ))}
               </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
