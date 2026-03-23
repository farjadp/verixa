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
        <div className="bg-white border border-[#f5ecd8] p-6 rounded-[24px] flex flex-col justify-between shadow-sm">
           <div className="flex items-center gap-2 text-gray-500 mb-2"><FileText className="w-4 h-4 text-[#C29967]" /> <h3 className="text-xs font-bold uppercase tracking-wider">Total Articles</h3></div>
           <div className="text-3xl font-serif font-black text-gray-900">{totalPosts}</div>
        </div>
        <div className="bg-white border border-[#f5ecd8] p-6 rounded-[24px] flex flex-col justify-between shadow-sm">
           <div className="flex items-center gap-2 text-gray-500 mb-2"><Globe className="w-4 h-4 text-green-600" /> <h3 className="text-xs font-bold uppercase tracking-wider">Live & Indexed</h3></div>
           <div className="text-3xl font-serif font-black text-gray-900">{publishedPosts} <span className="text-sm font-normal text-gray-400 ml-1">/{totalPosts}</span></div>
        </div>
        <div className="bg-white border border-[#f5ecd8] p-6 rounded-[24px] flex flex-col justify-between shadow-sm relative overflow-hidden group">
           <div className="flex items-center gap-2 text-gray-500 mb-2"><AlertCircle className="w-4 h-4 text-orange-500" /> <h3 className="text-xs font-bold uppercase tracking-wider">Missing SEO</h3></div>
           <div className="text-3xl font-serif font-black text-orange-600">{missingSeo}</div>
           {missingSeo > 0 && <div className="absolute top-0 right-0 w-16 h-16 bg-orange-100 rounded-bl-full opacity-50"></div>}
        </div>
        <div className="bg-white border border-[#f5ecd8] p-6 rounded-[24px] flex flex-col justify-between shadow-sm">
           <div className="flex items-center gap-2 text-gray-500 mb-2"><Share2 className="w-4 h-4 text-blue-500" /> <h3 className="text-xs font-bold uppercase tracking-wider">Social Variants Gen.</h3></div>
           <div className="text-3xl font-serif font-black text-blue-600">{socialReady} <span className="text-sm font-normal text-gray-400 ml-1">hooks</span></div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-6 min-h-0">
        
        {/* LEFT COLUMN: ACTIONS & TAXONOMY */}
        <div className="xl:col-span-1 flex flex-col gap-6 overflow-y-auto pr-2">
           
           {/* Action Command Center */}
           <div className="bg-white border border-[#f5ecd8] p-6 rounded-[24px] flex flex-col gap-4 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest border-b border-[#f5ecd8] pb-3">Module Triggers</h3>
              
              <Link href="/dashboard/admin/ai-factory" className="w-full bg-[#FAFAFA] hover:bg-[#F3F0EA] border border-[#f5ecd8] p-4 rounded-xl flex items-center justify-between group transition-all">
                <div>
                  <h4 className="font-bold text-gray-900 flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#C29967]" /> Launch AI Factory</h4>
                  <p className="text-[11px] text-gray-500 mt-1">Generate automated SEO Articles & Images.</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#C29967] transition-colors" />
              </Link>

              <Link href="/dashboard/admin/news-aggregator" className="w-full bg-[#FAFAFA] hover:bg-[#F3F0EA] border border-[#f5ecd8] p-4 rounded-xl flex items-center justify-between group transition-all">
                <div>
                  <h4 className="font-bold text-gray-900 flex items-center gap-2"><Globe className="w-4 h-4 text-blue-500" /> RSS AI Aggregator</h4>
                  <p className="text-[11px] text-gray-500 mt-1">Auto-fetch external news into Drafts.</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </Link>
              
              <Link href="/dashboard/admin/blog/new" className="w-full bg-[#FAFAFA] hover:bg-[#F3F0EA] border border-[#f5ecd8] p-4 rounded-xl flex items-center justify-between group transition-all">
                <div>
                  <h4 className="font-bold text-gray-900 flex items-center gap-2"><Plus className="w-4 h-4 text-green-600" /> New Manual Article</h4>
                  <p className="text-[11px] text-gray-500 mt-1">Write an article natively in Markdown.</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" />
              </Link>

              <Link href="/dashboard/admin/blog" className="w-full bg-[#FAFAFA] hover:bg-[#F3F0EA] border border-[#f5ecd8] p-4 rounded-xl flex items-center justify-between group transition-all">
                <div>
                  <h4 className="font-bold text-gray-900 flex items-center gap-2"><LayoutTemplate className="w-4 h-4 text-gray-500" /> Global Article Manager</h4>
                  <p className="text-[11px] text-gray-500 mt-1">Edit, Delete, and force Draft states.</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors" />
              </Link>
           </div>

           {/* Taxonomy Manager: Categories & Tags */}
           <div className="bg-white border border-[#f5ecd8] p-6 rounded-[24px] flex flex-col gap-4 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest border-b border-[#f5ecd8] pb-3 flex items-center justify-between">
                 Taxonomy Layer
                 <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-200">LOCKED</span>
              </h3>
              <p className="text-[11px] text-gray-500 mb-2 leading-relaxed">
                 Categories are locked globally at the database level to prevent SEO silo pollution. Tags map dynamically within category blocks.
              </p>
              <div className="space-y-3">
                 {CATEGORIES.map(cat => (
                    <div key={cat.value} className="bg-[#FAFAFA] border border-[#f5ecd8] p-3 rounded-lg">
                       <h4 className="text-[11px] font-black uppercase text-[#C29967]">{cat.label}</h4>
                       <p className="text-[10px] text-gray-600 mt-1">{cat.desc}</p>
                    </div>
                 ))}
                 <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex items-center justify-between mt-4">
                    <div>
                       <h4 className="text-[11px] font-black uppercase text-blue-600 flex items-center gap-1"><Hash className="w-3 h-3" /> Tags Engine</h4>
                       <p className="text-[10px] text-gray-600 mt-1">Global Tag indexing system.</p>
                    </div>
                    <button className="text-[10px] bg-white text-blue-600 px-3 py-1.5 rounded-md font-bold shadow-sm hover:bg-gray-50 transition-colors border border-blue-200 cursor-not-allowed opacity-50">Manage</button>
                 </div>
              </div>
           </div>

        </div>

        {/* RIGHT COLUMN: ARTICLE LISTING & AUDIT TABLE */}
        <div className="xl:col-span-2 bg-white border border-[#f5ecd8] rounded-[24px] flex flex-col shadow-sm overflow-hidden">
           <div className="p-5 border-b border-[#f5ecd8] flex items-center justify-between bg-[#FAFAFA]">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                 <Search className="w-4 h-4 text-[#C29967]" /> Content Tracker & Status Report
              </h3>
           </div>
           
           <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#FDFCFB] sticky top-0 z-10 border-b border-[#f5ecd8]">
                  <tr>
                    <th className="p-4 text-[11px] font-bold text-gray-600 uppercase tracking-wider w-[40%]">Article Name</th>
                    <th className="p-4 text-[11px] font-bold text-gray-600 uppercase tracking-wider">Category</th>
                    <th className="p-4 text-[11px] font-bold text-gray-600 uppercase tracking-wider text-center">SEO Config</th>
                    <th className="p-4 text-[11px] font-bold text-gray-600 uppercase tracking-wider text-center">Socials</th>
                    <th className="p-4 text-[11px] font-bold text-gray-600 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f5ecd8] text-sm">
                  {initialPosts.length === 0 ? (
                     <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500 text-xs font-mono">
                           No articles indexed. Initialize AI Content Factory.
                        </td>
                     </tr>
                  ) : (
                     initialPosts.map(post => (
                        <tr key={post.id} className="hover:bg-[#FDFCFB] transition-colors group">
                          <td className="p-4">
                             <div className="font-bold text-gray-900 line-clamp-1 group-hover:text-[#C29967] transition-colors">{post.title}</div>
                             <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-2">
                               {post.isPublished ? (
                                  <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Live</span>
                               ) : (
                                  <span className="text-gray-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Draft</span>
                               )}
                               • {format(new Date(post.createdAt), "MMM d, yyyy")}
                             </div>
                          </td>
                          <td className="p-4">
                             <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 bg-gray-100 border border-gray-200 px-2 py-1 rounded">
                               {post.category.replace(/_/g, " ")}
                             </span>
                          </td>
                          <td className="p-4 text-center">
                             {(post.seoTitle && post.seoDesc) ? (
                               <div className="w-6 h-6 mx-auto rounded-full bg-green-50 flex items-center justify-center text-green-600 border border-green-200" title="SEO Fully Configured">
                                  <CheckCircle2 className="w-3 h-3" />
                               </div>
                             ) : (
                               <div className="w-6 h-6 mx-auto rounded-full bg-orange-50 flex items-center justify-center text-orange-500 border border-orange-200" title="Missing Meta Tags">
                                  <AlertCircle className="w-3 h-3" />
                               </div>
                             )}
                          </td>
                          <td className="p-4 text-center">
                             {(post.socialHooks && post.socialHooks.length > 10) ? (
                               <div className="w-6 h-6 mx-auto rounded-full bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-200" title="Social Hooks Available">
                                  <Share2 className="w-3 h-3" />
                               </div>
                             ) : (
                               <div className="w-6 h-6 mx-auto rounded-full bg-gray-100 flex items-center justify-center text-gray-400" title="No Social Output">
                                  -
                               </div>
                             )}
                          </td>
                          <td className="p-4 text-right">
                             <Link href={`/dashboard/admin/blog/${post.id}`} className="text-[11px] font-bold text-gray-600 hover:text-[#C29967] bg-white border border-[#f5ecd8] hover:border-[#C29967] px-3 py-1.5 rounded-lg transition-colors shadow-sm">
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
