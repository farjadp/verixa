"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Plus, Edit3, Trash2, Eye, EyeOff, LayoutTemplate } from "lucide-react";
import Link from "next/link";
import { deleteBlogPost } from "@/actions/blog.actions";

export default function BlogListClient({ initialPosts }: { initialPosts: any[] }) {
  const router = useRouter();
  const [posts, setPosts] = useState(initialPosts);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${title}"?`)) return;
    setIsDeleting(id);
    try {
      await deleteBlogPost(id);
      setPosts(prev => prev.filter(p => p.id !== id));
      router.refresh();
    } catch (e: any) {
      alert(e.message || "Failed to delete post");
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="w-full flex flex-col h-full bg-[#111111] overflow-hidden">
      {/* Header Toolbar */}
      <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#161616] shrink-0">
        <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
          <LayoutTemplate className="w-4 h-4 text-[#C29967]" />
          Published Library
        </h2>
        <Link 
          href="/dashboard/admin/blog/new" 
          className="bg-[#C29967] hover:bg-[#b08856] text-white px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" /> Create New AI Post
        </Link>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-[#1A1A1A] rounded-xl border border-gray-800/50">
            <LayoutTemplate className="w-12 h-12 text-gray-600 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No Content Yet</h3>
            <p className="text-gray-400 max-w-sm mb-6">Drive high-intent traffic to your consultants by converting AI prompts into SEO structure.</p>
            <Link 
              href="/dashboard/admin/blog/new" 
              className="bg-[#1A1A1A] border border-gray-700 hover:bg-gray-800 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" /> Initialize First Post
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map(post => (
              <div key={post.id} className="bg-[#1A1A1A] border border-gray-800 rounded-xl overflow-hidden shadow-sm flex flex-col group">
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 bg-gray-900 border border-gray-700 text-gray-300 rounded-[8px] text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                      {post.category.replace(/_/g, " ")}
                    </span>
                    {post.isPublished ? (
                      <span className="flex items-center gap-1.5 text-green-400 text-[11px] font-bold tracking-wide">
                        <Eye className="w-3.5 h-3.5" /> Published
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-gray-500 text-[11px] font-bold tracking-wide">
                        <EyeOff className="w-3.5 h-3.5" /> Draft
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-white text-lg leading-tight mb-2 line-clamp-2 mix-blend-plus-lighter">{post.title}</h3>
                  <p className="text-gray-400 text-xs line-clamp-3 mb-4 leading-relaxed mix-blend-screen">{post.summary}</p>
                  
                  <div className="mt-auto pt-4 border-t border-gray-800 flex items-center justify-between text-xs text-gray-500">
                    <div>
                      <p>Updated: {format(new Date(post.updatedAt), "MMM d, yyyy")}</p>
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="p-3 border-t border-gray-800 bg-[#161616] flex justify-end gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link 
                    href={`/dashboard/admin/blog/${post.id}`}
                    className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-700"
                    title="Edit Post"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Link>
                  <button 
                    onClick={() => handleDelete(post.id, post.title)}
                    disabled={isDeleting === post.id}
                    className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors border border-red-500/20 disabled:opacity-50"
                    title="Delete Post"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
