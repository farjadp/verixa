"use client";

import { useState, useEffect } from "react";
import { Download, Search, CheckCircle, Database, Server, Filter, Mail, Globe, Users, MessageSquare, ChevronLeft, ChevronRight, X, Send } from "lucide-react";
import { extractAllContacts, ExtractedContact } from "@/actions/extractor.actions";
import { sendDirectBroadcast } from "@/actions/broadcast.actions";
import { sendDirectSms } from "@/actions/sms.actions";
import Link from "next/link";
import { RichEditor } from "@/components/ui/RichEditor";

export default function ExtractorClient() {
  const [data, setData] = useState<ExtractedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "CORPORATE" | "PUBLIC">("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const [metrics, setMetrics] = useState({ total: 0, corporateCount: 0, publicCount: 0 });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Compose Modal
  const [composeModal, setComposeModal] = useState<{ open: boolean; type: "EMAIL" | "SMS" }>({ open: false, type: "EMAIL" });
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const result = await extractAllContacts();
        setData(result.data);
        setMetrics({
          total: result.total,
          corporateCount: result.corporateCount,
          publicCount: result.publicCount
        });
      } catch (e) {
        alert("Failed to load contacts");
        console.error("Failed to load contacts", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const visibleData = data.filter(c => {
    if (filter === "CORPORATE" && !c.isCorporate) return false;
    if (filter === "PUBLIC" && c.isCorporate) return false;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return c.name.toLowerCase().includes(term) || 
             c.email.toLowerCase().includes(term) || 
             c.company.toLowerCase().includes(term);
    }
    return true;
  });

  // Reset pagination and selection on filter change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [filter, searchTerm]);

  const totalPages = Math.ceil(visibleData.length / itemsPerPage);
  const currentData = visibleData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const isAllCurrentDataSelected = currentData.length > 0 && currentData.every(c => selectedIds.has(c.id));

  const handleSelectPage = (checked: boolean) => {
    const next = new Set(selectedIds);
    currentData.forEach(c => {
      if (checked) next.add(c.id);
      else next.delete(c.id);
    });
    setSelectedIds(next);
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) next.add(id);
    else next.delete(id);
    setSelectedIds(next);
  };

  const downloadCSV = () => {
    const toExport = selectedIds.size > 0 ? visibleData.filter(d => selectedIds.has(d.id)) : visibleData;
    
    if (toExport.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "License,Name,Email,Phone,Company,Domain_Type\n";

    toExport.forEach(row => {
      const safelyQuote = (str: string) => `"${str.replace(/"/g, '""')}"`;
      const rowArr = [
        safelyQuote(row.id),
        safelyQuote(row.name),
        safelyQuote(row.email),
        safelyQuote(row.phone),
        safelyQuote(row.company),
        row.isCorporate ? "CORPORATE" : "PUBLIC"
      ];
      csvContent += rowArr.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Verixa_Contacts_${filter}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendBroadcast = async () => {
    const toBlast = visibleData.filter(d => selectedIds.has(d.id));
    
    if (toBlast.length === 0) return;
    if (!composeBody) {
      alert("Message body cannot be empty.");
      return;
    }

    setIsSending(true);
    try {
      if (composeModal.type === "EMAIL") {
        if (!composeSubject) throw new Error("Email requires a subject.");
        const emails = toBlast.map(t => t.email).filter(Boolean);
        await sendDirectBroadcast(emails, composeSubject, composeBody);
        alert(`Successfully dispatched emails to ${emails.length} targets.`);
      } else {
        const phones = toBlast.map(t => t.phone).filter(Boolean);
        await sendDirectSms(phones, composeBody);
        alert(`Successfully dispatched SMS to ${phones.length} targets.`);
      }
      setComposeModal({ ...composeModal, open: false });
      setComposeSubject("");
      setComposeBody("");
    } catch (e: any) {
      alert(e.message || "Failed to dispatch broadcast");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-serif font-black text-[#1A1F2B] flex items-center gap-3">
            <Database className="w-8 h-8 text-[#2FA4A9]" />
            Contacts & Data Extractor
          </h1>
          <p className="text-gray-500 mt-2 font-medium text-sm max-w-xl">
            Pull all valid contact parameters (Emails/Phones) from the unified registry. Segment by standard public providers vs Corporate extensions to run targeted pipeline campaigns.
          </p>
        </div>
        
        {/* Quick Action Buttons */}
        <div className="flex gap-3">
          <Link href="/dashboard/admin/broadcasts" className="px-5 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-50 transition-colors text-sm shadow-sm">
            <Mail className="w-4 h-4" /> Full Broadcast Engine
          </Link>
          <button 
            onClick={downloadCSV}
            disabled={loading || visibleData.length === 0}
            className="px-6 py-3 bg-[#2FA4A9] text-white rounded-xl font-black flex items-center gap-2 shadow-[0_4px_15px_rgba(47,164,169,0.3)] hover:shadow-[#2FA4A9]/50 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Export CSV {selectedIds.size > 0 ? `(${selectedIds.size} Selected)` : `(All ${visibleData.length})`}
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-3xl p-12 flex flex-col items-center justify-center animate-pulse shadow-sm">
           <Server className="w-10 h-10 text-gray-400 animate-bounce mb-4" />
           <p className="text-[#1A1F2B] font-bold text-lg">Extracting Data Pipeline...</p>
           <p className="text-gray-500 text-sm">Crawling ~35,000 registry profiles. This takes a few seconds.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div 
              onClick={() => setFilter("ALL")}
              className={`p-6 rounded-3xl cursor-pointer transition-all border ${filter === "ALL" ? "bg-[#1A1F2B] border-[#1A1F2B] text-white shadow-xl" : "bg-white border-gray-200 text-gray-500 hover:border-gray-300 shadow-sm"}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Users className={`w-5 h-5 ${filter === "ALL" ? "text-purple-400" : "text-gray-400"}`} />
                <h3 className="font-bold text-xs uppercase tracking-widest">Total Usable Contacts</h3>
              </div>
              <div className={`text-4xl font-black ${filter === "ALL" ? "text-white" : "text-[#1A1F2B]"}`}>
                {metrics.total.toLocaleString()}
              </div>
            </div>

            <div 
              onClick={() => setFilter("CORPORATE")}
              className={`p-6 rounded-3xl cursor-pointer transition-all border ${filter === "CORPORATE" ? "bg-[#1A1F2B] border-[#2FA4A9] text-white shadow-xl" : "bg-white border-gray-200 text-gray-500 hover:border-gray-300 shadow-sm"}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Globe className={`w-5 h-5 ${filter === "CORPORATE" ? "text-[#2FA4A9]" : "text-gray-400"}`} />
                <h3 className="font-bold text-xs uppercase tracking-widest">Corporate Domains</h3>
              </div>
              <div className={`text-4xl font-black ${filter === "CORPORATE" ? "text-white" : "text-[#1A1F2B]"}`}>
                {metrics.corporateCount.toLocaleString()}
              </div>
              <p className={`text-[10px] uppercase font-bold mt-2 ${filter === "CORPORATE" ? "text-gray-400" : "text-gray-400"}`}>Professional Targets</p>
            </div>

            <div 
              onClick={() => setFilter("PUBLIC")}
              className={`p-6 rounded-3xl cursor-pointer transition-all border ${filter === "PUBLIC" ? "bg-[#1A1F2B] border-amber-500 text-white shadow-xl" : "bg-white border-gray-200 text-gray-500 hover:border-gray-300 shadow-sm"}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Mail className={`w-5 h-5 ${filter === "PUBLIC" ? "text-amber-500" : "text-gray-400"}`} />
                <h3 className="font-bold text-xs uppercase tracking-widest">Public Domains</h3>
              </div>
              <div className={`text-4xl font-black ${filter === "PUBLIC" ? "text-white" : "text-[#1A1F2B]"}`}>
                {metrics.publicCount.toLocaleString()}
              </div>
              <p className={`text-[10px] uppercase font-bold mt-2 ${filter === "PUBLIC" ? "text-gray-400" : "text-gray-400"}`}>Gmail, Yahoo, iCloud, etc.</p>
            </div>
          </div>

          <div className="bg-[#0F2A44] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
            {/* Table Control Bar */}
            <div className="p-4 border-b border-gray-800 flex flex-wrap gap-4 justify-between items-center bg-[#153452]">
              <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-gray-400" />
                    <span className="text-white font-bold text-sm">
                      {selectedIds.size > 0 ? `${selectedIds.size} Rows Selected` : "Bulk Selector Mode"}
                    </span>
                 </div>
                 {selectedIds.size > 0 && (
                   <div className="flex gap-2">
                     <button 
                       onClick={() => setComposeModal({ open: true, type: "EMAIL" })}
                       className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded text-xs font-bold text-white flex items-center gap-1.5 transition-colors"
                     >
                       <Mail className="w-3.5 h-3.5" /> Send Email
                     </button>
                     <button 
                       onClick={() => setComposeModal({ open: true, type: "SMS" })}
                       className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded text-xs font-bold text-white flex items-center gap-1.5 transition-colors"
                     >
                       <MessageSquare className="w-3.5 h-3.5" /> Send SMS
                     </button>
                   </div>
                 )}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter name or domain..." 
                  className="pl-9 pr-4 py-2 bg-black/30 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-[#2FA4A9] w-64 transition-all"
                />
              </div>
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#0B1E31] text-gray-400 text-[11px] font-bold uppercase tracking-wider border-b border-gray-800">
                  <tr>
                    <th className="px-4 py-4 w-10 text-center">
                      <input 
                        type="checkbox" 
                        checked={isAllCurrentDataSelected}
                        onChange={(e) => handleSelectPage(e.target.checked)}
                        className="rounded border-gray-600 bg-gray-800 text-[#2FA4A9] focus:ring-[#2FA4A9] w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="px-2 py-4 text-gray-500">#</th>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Email Extracted</th>
                    <th className="px-6 py-4">Phone Registered</th>
                    <th className="px-6 py-4">Associated Company</th>
                    <th className="px-6 py-4 text-right">Domain Vector</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 text-gray-300">
                  {currentData.map((contact, i) => (
                    <tr key={contact.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 text-center">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.has(contact.id)}
                          onChange={(e) => handleSelectRow(contact.id, e.target.checked)}
                          className="rounded border-gray-600 bg-gray-800 text-[#2FA4A9] focus:ring-[#2FA4A9] w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="px-2 py-3 text-gray-500 text-xs">{(currentPage - 1) * itemsPerPage + i + 1}</td>
                      <td className="px-6 py-3 font-bold text-white">{contact.name}</td>
                      <td className="px-6 py-3 font-mono text-[#2FA4A9]">{contact.email}</td>
                      <td className="px-6 py-3">{contact.phone || <span className="text-gray-600 italic">None</span>}</td>
                      <td className="px-6 py-3 truncate max-w-[200px]">{contact.company || "-"}</td>
                      <td className="px-6 py-3 text-right">
                        <span className={`px-2 py-1 text-[10px] uppercase font-black tracking-widest rounded ${
                          contact.isCorporate ? "bg-[#2FA4A9]/20 text-[#2FA4A9] border border-[#2FA4A9]" : "bg-gray-800 text-gray-400"
                        }`}>
                          {contact.isCorporate ? "Corporate" : "Public"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {currentData.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-gray-500">
                        No targets match your current filter parameters or page bounds.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Core */}
            {totalPages > 1 && (
              <div className="p-4 bg-[#0B1E31] border-t border-gray-800 flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, visibleData.length)} of {visibleData.length.toLocaleString()} entries
                </span>
                <div className="flex items-center gap-2">
                   <button 
                     onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                     disabled={currentPage === 1}
                     className="p-1.5 bg-white/5 hover:bg-white/10 border border-gray-700 rounded text-gray-400 disabled:opacity-30 transition-colors"
                   >
                     <ChevronLeft className="w-4 h-4" />
                   </button>
                   <span className="text-xs text-white font-mono px-2">
                     Page {currentPage} / {totalPages}
                   </span>
                   <button 
                     onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                     disabled={currentPage === totalPages}
                     className="p-1.5 bg-white/5 hover:bg-white/10 border border-gray-700 rounded text-gray-400 disabled:opacity-30 transition-colors"
                   >
                     <ChevronRight className="w-4 h-4" />
                   </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Quick Compose Modal overlay */}
      {composeModal.open && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F2A44] border border-gray-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-[#153452]">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                {composeModal.type === "EMAIL" ? <Mail className="w-5 h-5 text-[#2FA4A9]" /> : <MessageSquare className="w-5 h-5 text-[#2FA4A9]" />}
                Quick Compose: {composeModal.type}
              </h2>
              <button onClick={() => setComposeModal({ ...composeModal, open: false })} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between text-sm">
                 <span className="text-gray-400">Target Audience:</span>
                 <span className="bg-[#2FA4A9]/20 text-[#2FA4A9] px-2 py-0.5 rounded font-bold">
                   {selectedIds.size} Selected Nodes
                 </span>
              </div>
              
              {composeModal.type === "EMAIL" && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Subject Line</label>
                  <input 
                    type="text" 
                    value={composeSubject}
                    onChange={e => setComposeSubject(e.target.value)}
                    placeholder="Enter email subject..."
                    className="w-full bg-black/30 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-[#2FA4A9]"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  Message Body {composeModal.type === "SMS" && `(${composeBody.length}/160 chars)`}
                </label>
                {composeModal.type === "EMAIL" ? (
                  <RichEditor 
                     value={composeBody}
                     onChange={setComposeBody}
                     placeholder="Write a beautiful HTML email..."
                  />
                ) : (
                  <textarea 
                     rows={8}
                     value={composeBody}
                     onChange={e => setComposeBody(e.target.value)}
                     placeholder="Basic text only..."
                     className="w-full bg-black/30 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-[#2FA4A9] resize-none"
                  />
                )}
              </div>
            </div>
            <div className="p-5 border-t border-gray-800 bg-[#0B1E31] flex justify-end gap-3">
               <button 
                 onClick={() => setComposeModal({ ...composeModal, open: false })}
                 className="px-4 py-2 text-gray-400 hover:text-white font-medium"
               >
                 Cancel
               </button>
               <button 
                 onClick={handleSendBroadcast}
                 disabled={isSending}
                 className="px-6 py-2 bg-[#2FA4A9] hover:bg-[#208085] text-white font-bold flex items-center gap-2 rounded-lg disabled:opacity-50 transition-colors"
               >
                 <Send className="w-4 h-4" /> {isSending ? "Dispatching..." : "Send Now"}
               </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
