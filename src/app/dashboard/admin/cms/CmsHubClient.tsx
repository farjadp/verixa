"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { 
  Plus, Sparkles, LayoutTemplate, 
  Search, Globe, FileText, Share2, 
  AlertCircle, CheckCircle2, ChevronRight, Hash 
} from "lucide-react";

const CATEGORIES = [
  { value: "IMMIGRATION_GUIDES", label: "Immigration Guides", desc: "Process & technical knowledge." },
  { value: "CONSULTANT_INSIGHTS", label: "Consultant Insights", desc: "Expert tips directly from RCICs." },
  { value: "CASE_BASED_CONTENT", label: "Case-Based Scenarios", desc: "Real-world examples and stories." },
  { value: "UPDATES_POLICY", label: "Updates & Policy", desc: "New IRCC laws and news." },
];

export default function CmsHubClient({ initialPosts }: { initialPosts: any[] }) {
  // Global Metrics
  const totalPosts = initialPosts.length;
  const publishedPosts = initialPosts.filter(p => p.isPublished).length;
  const missingSeo = initialPosts.filter(p => !p.seoTitle || !p.seoDesc).length;
  const socialReady = initialPosts.filter(p => p.socialHooks && p.socialHooks.length > 10).length;

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* 1. TOP METRICS ENGINE */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 shrink-0">
        <div className="bg-[#111111] border border-gray-800 p-6 rounded-2xl flex flex-col justify-between shadow-xl">
           <div className="flex items-center gap-2 text-gray-400 mb-2"><FileText className="w-4 h-4 text-[#C29967]" /> <h3 className="text-xs font-bold uppercase tracking-wider">Total Articles</h3></div>
           <div className="text-3xl font-serif font-black text-white">{totalPosts}</div>
        </div>
        <div className="bg-[#111111] border border-gray-800 p-6 rounded-2xl flex flex-col justify-between shadow-xl">
           <div className="flex items-center gap-2 text-gray-400 mb-2"><Globe className="w-4 h-4 text-green-500" /> <h3 className="text-xs font-bold uppercase tracking-wider">Live & Indexed</h3></div>
           <div className="text-3xl font-serif font-black text-white">{publishedPosts} <span className="text-sm font-normal text-gray-500 ml-1">/{totalPosts}</span></div>
        </div>
        <div className="bg-[#111111] border border-gray-800 p-6 rounded-2xl flex flex-col justify-between shadow-xl relative overflow-hidden group">
           <div className="flex items-center gap-2 text-gray-400 mb-2"><AlertCircle className="w-4 h-4 text-orange-500" /> <h3 className="text-xs font-bold uppercase tracking-wider">Missing SEO</h3></div>
           <div className="text-3xl font-serif font-black text-orange-400">{missingSeo}</div>
           {missingSeo > 0 && <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/20 rounded-bl-full opacity-50"></div>}
        </div>
        <div className="bg-[#111111] border border-gray-800 p-6 rounded-2xl flex flex-col justify-between shadow-xl">
           <div className="flex items-center gap-2 text-gray-400 mb-2"><Share2 className="w-4 h-4 text-blue-500" /> <h3 className="text-xs font-bold uppercase tracking-wider">Social Variants Gen.</h3></div>
           <div className="text-3xl font-serif font-black text-blue-400">{socialReady} <span className="text-sm font-normal text-gray-500 ml-1">hooks</span></div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-6 min-h-0">
        
        {/* LEFT COLUMN: ACTIONS & TAXONOMY */}
        <div className="xl:col-span-1 flex flex-col gap-6 overflow-y-auto pr-2">
           
           {/* Action Command Center */}
           <div className="bg-[#111111] border border-gray-800 p-6 rounded-2xl flex flex-col gap-4 shadow-xl">
              <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest border-b border-gray-800 pb-3">Module Triggers</h3>
              
              <Link href="/dashboard/admin/ai-factory" className="w-full bg-gradient-to-r from-[#1A1A1A] to-[#2A2A2A] hover:to-[#3A3A3A] border border-gray-700 p-4 rounded-xl flex items-center justify-between group transition-all shadow-[0_0_15px_rgba(194,153,103,0.1)] hover:shadow-[0_0_20px_rgba(194,153,103,0.2)]">
                <div>
                  <h4 className="font-bold text-white flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#C29967]" /> Launch AI Factory</h4>
                  <p className="text-[11px] text-gray-400 mt-1">Generate automated SEO Articles & Images.</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
              </Link>
              
              <Link href="/dashboard/admin/blog/new" className="w-full bg-[#1A1A1A] hover:bg-gray-800 border border-gray-800 p-4 rounded-xl flex items-center justify-between group transition-all">
                <div>
                  <h4 className="font-bold text-white flex items-center gap-2"><Plus className="w-4 h-4 text-blue-400" /> New Manual Article</h4>
                  <p className="text-[11px] text-gray-400 mt-1">Write an article natively in Markdown.</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
              </Link>

              <Link href="/dashboard/admin/blog" className="w-full bg-[#1A1A1A] hover:bg-gray-800 border border-gray-800 p-4 rounded-xl flex items-center justify-between group transition-all">
                <div>
                  <h4 className="font-bold text-white flex items-center gap-2"><LayoutTemplate className="w-4 h-4 text-gray-400" /> Global Article Manager</h4>
                  <p className="text-[11px] text-gray-400 mt-1">Edit, Delete, and force Draft states.</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
              </Link>
           </div>

           {/* Taxonomy Manager: Categories & Tags */}
           <div className="bg-[#111111] border border-gray-800 p-6 rounded-2xl flex flex-col gap-4 shadow-xl">
              <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest border-b border-gray-800 pb-3 flex items-center justify-between">
                 Taxonomy Layer
                 <span className="text-[10px] bg-red-900/30 text-red-400 px-2 py-0.5 rounded border border-red-500/20">LOCKED</span>
              </h3>
              <p className="text-[11px] text-gray-500 mb-2 leading-relaxed">
                 Categories are locked globally at the database level to prevent SEO silo pollution. Tags map dynamically within category blocks.
              </p>
              <div className="space-y-3">
                 {CATEGORIES.map(cat => (
                    <div key={cat.value} className="bg-[#1A1A1A] border border-gray-800 p-3 rounded-lg">
                       <h4 className="text-[11px] font-black uppercase text-[#C29967]">{cat.label}</h4>
                       <p className="text-[10px] text-gray-500 mt-1">{cat.desc}</p>
                    </div>
                 ))}
                 <div className="bg-blue-900/10 border border-blue-900/30 p-3 rounded-lg flex items-center justify-between mt-4">
                    <div>
                       <h4 className="text-[11px] font-black uppercase text-blue-400 flex items-center gap-1"><Hash className="w-3 h-3" /> Tags Engine</h4>
                       <p className="text-[10px] text-gray-500 mt-1">Global Tag indexing system.</p>
                    </div>
                    <button className="text-[10px] bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-md font-bold hover:bg-blue-500/30 transition-colors cursor-not-allowed opacity-50">Manage</button>
                 </div>
              </div>
           </div>

        </div>

        {/* RIGHT COLUMN: ARTICLE LISTING & AUDIT TABLE */}
        <div className="xl:col-span-2 bg-[#111111] border border-gray-800 rounded-2xl flex flex-col shadow-xl overflow-hidden">
           <div className="p-5 border-b border-gray-800 flex items-center justify-between bg-[#161616]">
              <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                 <Search className="w-4 h-4 text-[#C29967]" /> Content Tracker & Status Report
              </h3>
           </div>
           
           <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#1A1A1A] sticky top-0 z-10 border-b border-gray-800 shadow-sm">
                  <tr>
                    <th className="p-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider w-[40%]">Article Name</th>
                    <th className="p-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="p-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">SEO Config</th>
                    <th className="p-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Socials</th>
                    <th className="p-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 text-sm">
                  {initialPosts.length === 0 ? (
                     <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500 text-xs font-mono">
                           No articles indexed. Initialize AI Content Factory.
                        </td>
                     </tr>
                  ) : (
                     initialPosts.map(post => (
                        <tr key={post.id} className="hover:bg-[#1A1A1A] transition-colors group">
                          <td className="p-4">
                             <div className="font-bold text-gray-200 line-clamp-1 group-hover:text-[#C29967] transition-colors">{post.title}</div>
                             <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-2">
                               {post.isPublished ? (
                                  <span className="text-green-500 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Live</span>
                               ) : (
                                  <span className="text-gray-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Draft</span>
                               )}
                               • {format(new Date(post.createdAt), "MMM d, yyyy")}
                             </div>
                          </td>
                          <td className="p-4">
                             <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-900 border border-gray-800 px-2 py-1 rounded">
                               {post.category.replace(/_/g, " ")}
                             </span>
                          </td>
                          <td className="p-4 text-center">
                             {(post.seoTitle && post.seoDesc) ? (
                               <div className="w-6 h-6 mx-auto rounded-full bg-green-500/10 flex items-center justify-center text-green-500 border border-green-500/20" title="SEO Fully Configured">
                                  <CheckCircle2 className="w-3 h-3" />
                               </div>
                             ) : (
                               <div className="w-6 h-6 mx-auto rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20" title="Missing Meta Tags">
                                  <AlertCircle className="w-3 h-3" />
                               </div>
                             )}
                          </td>
                          <td className="p-4 text-center">
                             {(post.socialHooks && post.socialHooks.length > 10) ? (
                               <div className="w-6 h-6 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20" title="Social Hooks Available">
                                  <Share2 className="w-3 h-3" />
                               </div>
                             ) : (
                               <div className="w-6 h-6 mx-auto rounded-full bg-gray-800 flex items-center justify-center text-gray-600" title="No Social Output">
                                  -
                               </div>
                             )}
                          </td>
                          <td className="p-4 text-right">
                             <Link href={`/dashboard/admin/blog/${post.id}`} className="text-[11px] font-bold text-gray-400 hover:text-white bg-gray-800 px-3 py-1.5 rounded-lg transition-colors border border-gray-700">
                               Edit
                             </Link>
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
