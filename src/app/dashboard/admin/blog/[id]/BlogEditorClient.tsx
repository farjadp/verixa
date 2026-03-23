"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Globe, EyeOff, LayoutTemplate } from "lucide-react";
import Link from "next/link";
import { createBlogPost, updateBlogPost } from "@/actions/blog.actions";
import dynamic from "next/dynamic";

const MDXEditor = dynamic(() => import("@/components/blog/MDXEditorComponent"), {
  ssr: false,
  loading: () => <div className="min-h-[500px] flex items-center justify-center bg-white border border-gray-200 rounded-xl text-gray-500 font-mono text-xs shadow-sm">Initialize Rich Text Engine...</div>
});

const CATEGORIES = [
  { value: "IMMIGRATION_GUIDES", label: "Immigration Guides" },
  { value: "CONSULTANT_INSIGHTS", label: "Consultant Insights" },
  { value: "CASE_BASED_CONTENT", label: "Case-Based Content" },
  { value: "UPDATES_POLICY", label: "Updates & Policy" },
];

export default function BlogEditorClient({ initialPost, isNew }: { initialPost: any, isNew: boolean }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    title: initialPost?.title || "",
    slug: initialPost?.slug || "",
    summary: initialPost?.summary || "",
    category: initialPost?.category || "IMMIGRATION_GUIDES",
    coverImage: initialPost?.coverImage || "",
    content: initialPost?.content || "",
    isPublished: initialPost?.isPublished || false,
    seoTitle: initialPost?.seoTitle || "",
    seoDesc: initialPost?.seoDesc || ""
  });

  // Auto-generate slug from title if it's a new post and slug is empty
  useEffect(() => {
    if (isNew && formData.title && !initialPost?.slug) {
      const autoSlug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setFormData(prev => ({ ...prev, slug: autoSlug }));
    }
  }, [formData.title, isNew, initialPost]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.title || !formData.slug || !formData.content || !formData.category) {
      setError("Title, Slug, Category, and Content are strictly required.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      if (isNew) {
        await createBlogPost(formData);
      } else {
        await updateBlogPost(initialPost.id, formData);
      }
      
      router.push("/dashboard/admin/blog");
      router.refresh();
    } catch (e: any) {
      setError(e.message || "Failed to save blog post. Ensure slug is unique.");
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full flex flex-col h-full bg-[#111111] border border-gray-800 rounded-xl overflow-hidden shadow-2xl relative">
      
      {/* HEADER */}
      <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#161616] shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/admin/blog" className="p-2 bg-gray-900 border border-gray-800 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors">
             <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4 text-[#C29967]" />
              {isNew ? "Create New Post" : "Edit Publication"}
            </h2>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-400 font-bold cursor-pointer">
            <span className={formData.isPublished ? "text-green-500" : ""}>
               {formData.isPublished ? <Globe className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </span>
            {formData.isPublished ? "Published" : "Draft"}
            <input 
               type="checkbox" 
               className="hidden" 
               checked={formData.isPublished} 
               onChange={(e) => setFormData(prev => ({...prev, isPublished: e.target.checked}))}
            />
            <div className={`w-10 h-6 rounded-full p-1 transition-colors ${formData.isPublished ? "bg-green-500" : "bg-gray-700"}`}>
               <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${formData.isPublished ? "translate-x-4" : "translate-x-0"}`}></div>
            </div>
          </label>

          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-[#C29967] hover:bg-[#b08856] text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save Content"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col lg:flex-row gap-8">
        
        {/* LEFT COLUMN: CORE META & CONTENT */}
        <div className="flex-1 space-y-6">
          {error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold">
              {error}
            </div>
          )}

          <div className="space-y-4">
             <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">H1 Article Title</label>
                <input 
                  type="text" 
                  name="title"
                  value={formData.title} 
                  onChange={handleChange}
                  className="w-full bg-[#1A1A1A] border border-gray-800 rounded-lg p-3 text-white text-lg font-bold font-serif focus:outline-none focus:border-[#C29967] transition-colors"
                  placeholder="How to Choose a Licensed Immigration Consultant (2026 Guide)"
                />
             </div>
             
             <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Rich Content Editor</label>
                <p className="text-xs text-gray-600 mb-2 font-mono">Build with structural H2s, visual tables, and drag-and-drop native images.</p>
                <MDXEditor 
                  markdown={formData.content} 
                  onChange={(val) => setFormData(prev => ({...prev, content: val}))} 
                />
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SEO & METADATA SETTINGS */}
        <div className="w-full lg:w-[400px] shrink-0 space-y-6">
           
           <div className="bg-[#161616] border border-gray-800 p-5 rounded-xl space-y-5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-3">Publication Data</h3>
              
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">URL Slug</label>
                <input 
                  type="text" 
                  name="slug"
                  value={formData.slug} 
                  onChange={handleChange}
                  className="w-full bg-[#1A1A1A] border border-gray-800 rounded-lg p-2.5 text-gray-300 text-sm focus:outline-none focus:border-[#C29967]"
                  placeholder="how-to-choose-an-rcic"
                />
             </div>

             <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Category Pillar</label>
                <select 
                  name="category"
                  value={formData.category} 
                  onChange={handleChange}
                  className="w-full bg-[#1A1A1A] border border-gray-800 rounded-lg p-2.5 text-gray-300 text-sm focus:outline-none focus:border-[#C29967] appearance-none"
                >
                   {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
             </div>

             <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Hero Image URL</label>
                <input 
                  type="text" 
                  name="coverImage"
                  value={formData.coverImage} 
                  onChange={handleChange}
                  className="w-full bg-[#1A1A1A] border border-gray-800 rounded-lg p-2.5 text-gray-300 text-sm focus:outline-none focus:border-[#C29967]"
                  placeholder="https://example.com/image.jpg"
                />
             </div>
           </div>

           <div className="bg-[#161616] border border-gray-800 p-5 rounded-xl space-y-5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-3">SEO Override Layer</h3>
              <p className="text-[11px] text-gray-500 leading-relaxed -mt-1">Metadata is required. This dictates how Google AI and ChatGPT parse your insights.</p>
              
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Summary (3-4 lines)</label>
                <textarea 
                  name="summary"
                  value={formData.summary} 
                  onChange={handleChange}
                  rows={3}
                  className="w-full bg-[#1A1A1A] border border-gray-800 rounded-lg p-2.5 text-gray-300 text-sm focus:outline-none focus:border-[#C29967] resize-none"
                  placeholder="Quick answer for Google snippet..."
                />
             </div>

             <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Meta Title (Optional)</label>
                <input 
                  type="text" 
                  name="seoTitle"
                  value={formData.seoTitle} 
                  onChange={handleChange}
                  className="w-full bg-[#1A1A1A] border border-gray-800 rounded-lg p-2.5 text-gray-300 text-sm focus:outline-none focus:border-[#C29967]"
                  placeholder="Defaults to H1 Title"
                />
             </div>

             <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Meta Description (Optional)</label>
                <textarea 
                  name="seoDesc"
                  value={formData.seoDesc} 
                  onChange={handleChange}
                  rows={2}
                  className="w-full bg-[#1A1A1A] border border-gray-800 rounded-lg p-2.5 text-gray-300 text-sm focus:outline-none focus:border-[#C29967] resize-none"
                  placeholder="Defaults to Summary"
                />
             </div>
           </div>

        </div>

      </div>
    </div>
  );
}
