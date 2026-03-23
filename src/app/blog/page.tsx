// ============================================================================
// Hardware Source: app/blog/page.tsx
// Route: /blog
// Version: 1.0.0 — 2026-03-23
// Why: The SEO acquisition landing hub. Organizes content efficiently.
// ============================================================================

import { getBlogPosts } from "@/actions/blog.actions";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { format } from "date-fns";
import { BookOpen, Scale, Lightbulb, RefreshCw, ArrowRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Canadian Immigration Blog & Guides | Verixa",
  description: "Read expert insights, immigration guides, and case-based studies to choose the right licensed RCIC via Verixa.",
};

const CATEGORIES = [
  { value: "ALL", label: "All Content", icon: BookOpen },
  { value: "IMMIGRATION_GUIDES", label: "Immigration Guides", icon: BookOpen },
  { value: "CONSULTANT_INSIGHTS", label: "Consultant Insights", icon: Lightbulb },
  { value: "CASE_BASED_CONTENT", label: "Case-Based Scenarios", icon: Scale },
  { value: "UPDATES_POLICY", label: "Updates & Policy", icon: RefreshCw },
];

export default async function BlogIndexPage({
  searchParams
}: {
  searchParams: Promise<{ c?: string }>
}) {
  const posts = await getBlogPosts(true); // only published
  
  const sp = await searchParams;
  const filterCat = sp.c || "ALL";

  const filteredPosts = filterCat === "ALL" 
    ? posts 
    : posts.filter(p => p.category === filterCat);

  return (
    <div className="min-h-screen bg-[#FDFCFB] font-sans flex flex-col">
      <Header />
      
      {/* HERO */}
      <section className="bg-white border-b border-[#f5ecd8] pt-24 pb-16 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-serif font-black text-[#1A1A1A] tracking-tight mb-6">
            Immigration <span className="text-[#C29967] italic">Intelligence.</span>
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            Master the Canadian immigration process with verified guides, consultant insights, and real-case breakdowns. Exclusively on Verixa.
          </p>

          {/* PILLARS / FILTERS */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {CATEGORIES.map(cat => {
              const isActive = filterCat === cat.value;
              const Icon = cat.icon;
              return (
                <Link 
                  key={cat.value} 
                  href={`/blog${cat.value !== "ALL" ? `?c=${cat.value}` : ''}`}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold border transition-all ${
                    isActive 
                      ? "bg-[#1A1A1A] border-[#1A1A1A] text-white shadow-xl shadow-black/5" 
                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-4 h-4" /> {cat.label}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* GRID */}
      <section className="py-16 px-6 flex-1">
        <div className="max-w-6xl mx-auto">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-20 text-gray-400 font-medium">
              Check back soon for upcoming insights in this category.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.map(post => (
                <Link 
                  href={`/blog/${post.slug}`} 
                  key={post.id}
                  className="group bg-white border border-[#f5ecd8] rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-[#C29967]/10 transition-all duration-300 flex flex-col"
                >
                  {/* IMAGES (optional placeholder) */}
                  <div className="h-48 bg-gray-100 flex items-center justify-center overflow-hidden border-b border-[#f5ecd8]">
                    {post.coverImage ? (
                      <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] relative flex items-center justify-center">
                        <div className="absolute opacity-10 font-serif text-[#C29967] text-8xl scale-150 tracking-tighter mix-blend-plus-lighter blur-[1px] -rotate-12">
                          Verixa
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-8 flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#C29967] bg-[#C29967]/10 px-3 py-1 rounded-full">
                        {post.category.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs font-semibold text-gray-400">
                        {format(new Date(post.publishedAt || post.createdAt), "MMM d, yyyy")}
                      </span>
                    </div>

                    <h2 className="text-xl font-bold text-[#1A1A1A] mb-3 leading-snug group-hover:text-[#C29967] transition-colors">{post.title}</h2>
                    <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed mb-6 flex-1">{post.summary}</p>
                    
                    <div className="mt-auto flex items-center text-sm font-bold text-[#1A1A1A] group-hover:text-[#C29967] transition-colors gap-2">
                       Read Insight <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
