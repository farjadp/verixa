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
import { BookOpen, Scale, Lightbulb, RefreshCw, ArrowRight, Search, ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Canadian Immigration Blog & Guides | Verixa",
  description: "Read expert insights, immigration guides, and case-based studies to choose the right licensed RCIC via Verixa.",
};

export const dynamic = "force-dynamic";

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
  searchParams: Promise<{ c?: string, q?: string, page?: string }>
}) {
  const posts = await getBlogPosts(true); 
  
  const sp = await searchParams;
  const filterCat = sp.c || "ALL";
  const searchQuery = sp.q?.toLowerCase() || "";
  const currentPage = parseInt(sp.page || "1", 10);
  const POSTS_PER_PAGE = 9;

  // Filter Logic
  let filteredPosts = posts;
  
  if (filterCat !== "ALL") {
    filteredPosts = filteredPosts.filter(p => p.category === filterCat);
  }
  
  if (searchQuery) {
    filteredPosts = filteredPosts.filter(p => 
      p.title.toLowerCase().includes(searchQuery) || 
      p.summary.toLowerCase().includes(searchQuery)
    );
  }

  // Pagination Logic
  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE
  );

  return (
    <div className="min-h-screen bg-[#ffffff] font-sans flex flex-col">
      <Header />
      
      {/* HERO & SEARCH */}
      <section className="bg-white border-b border-[#e5e7eb] pt-24 pb-16 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-serif font-black text-[#1A1F2B] tracking-tight mb-6">
            Immigration <span className="text-[#2FA4A9] italic">Intelligence.</span>
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            Master the Canadian immigration process with verified guides, consultant insights, and real-case breakdowns. Exclusively on Verixa.
          </p>

          {/* SEARCH BAR */}
          <form action="/blog" method="GET" className="max-w-xl mx-auto mb-10 relative">
             <input type="hidden" name="c" value={filterCat} />
             <input 
               type="text" 
               name="q" 
               defaultValue={searchQuery}
               placeholder="Search articles by topic, keyword, or policy..." 
               className="w-full bg-[#FAFAFA] border border-[#e5e7eb] rounded-full py-4 pl-14 pr-6 text-[#1A1F2B] placeholder:text-gray-400 focus:outline-none focus:border-[#2FA4A9] focus:ring-4 focus:ring-[#2FA4A9]/10 transition-all font-medium"
             />
             <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-gray-400" />
             </div>
             <button type="submit" className="absolute inset-y-2 right-2 bg-[#0F2A44] hover:bg-black text-white px-6 rounded-full text-sm font-bold transition-colors">
               Search
             </button>
          </form>

          {/* PILLARS / FILTERS */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {CATEGORIES.map(cat => {
              const isActive = filterCat === cat.value;
              const Icon = cat.icon;
              return (
                <Link 
                  key={cat.value} 
                  href={`/blog?c=${cat.value}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}`}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold border transition-all ${
                    isActive 
                      ? "bg-[#0F2A44] border-[#0F2A44] text-white shadow-xl shadow-black/5" 
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
      <section className="py-16 px-6 flex-1 bg-[#ffffff]">
        <div className="max-w-6xl mx-auto">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-24 border-2 border-dashed border-[#e5e7eb] rounded-3xl bg-white">
              <BookOpen className="w-12 h-12 text-[#e5e7eb] mx-auto mb-4" />
              <h3 className="text-xl font-bold tracking-tight text-[#1A1F2B] mb-2">No intelligence found.</h3>
              <p className="text-gray-400 font-medium">Check back soon or adjust your search parameters.</p>
              <Link href="/blog" className="mt-6 inline-block text-sm font-bold text-[#2FA4A9] border-b border-[#2FA4A9] pb-0.5">Clear Filters</Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {paginatedPosts.map(post => (
                  <Link 
                    href={`/blog/${post.slug}`} 
                    key={post.id}
                    className="group bg-white border border-[#e5e7eb] rounded-[32px] overflow-hidden hover:shadow-2xl hover:shadow-[#2FA4A9]/10 transition-all duration-300 flex flex-col relative"
                  >
                    {/* IMAGES */}
                    <div className="h-56 bg-gray-100 flex items-center justify-center overflow-hidden border-b border-[#e5e7eb] relative">
                      {post.coverImage ? (
                        <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#0F2A44] to-[#2A2A2A] relative flex items-center justify-center">
                          <div className="absolute opacity-10 font-serif text-[#2FA4A9] text-8xl scale-150 tracking-tighter mix-blend-plus-lighter blur-[1px] -rotate-12">
                            Verixa
                          </div>
                        </div>
                      )}
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    </div>

                    <div className="p-8 flex-1 flex flex-col relative z-10 bg-white">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#2FA4A9] bg-[#2FA4A9]/10 px-3 py-1 rounded-full">
                          {post.category.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs font-semibold text-gray-400">
                          {format(new Date(post.publishedAt || post.createdAt), "MMM d, yyyy")}
                        </span>
                      </div>

                      <h2 className="text-2xl font-serif text-[#1A1F2B] font-medium mb-3 leading-snug group-hover:text-[#2FA4A9] transition-colors">{post.title}</h2>
                      <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed mb-8 flex-1">{post.summary}</p>
                      
                      <div className="mt-auto flex justify-end">
                         <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center group-hover:bg-[#2FA4A9] group-hover:border-[#2FA4A9] group-hover:text-white transition-all">
                           <ArrowRight className="w-4 h-4" />
                         </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* PAGINATION ENGINE */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-20">
                   {currentPage > 1 ? (
                     <Link href={`/blog?page=${currentPage - 1}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}${filterCat !== "ALL" ? `&c=${filterCat}` : ''}`} className="w-12 h-12 flex items-center justify-center rounded-full bg-white border border-[#e5e7eb] text-gray-500 hover:text-[#2FA4A9] hover:border-[#2FA4A9] transition-colors shadow-sm">
                       <ChevronLeft className="w-5 h-5" />
                     </Link>
                   ) : (
                     <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100 text-gray-300 cursor-not-allowed">
                       <ChevronLeft className="w-5 h-5" />
                     </div>
                   )}
                   
                   <div className="text-sm font-bold text-gray-500 tracking-widest uppercase">
                     Page <span className="text-[#1A1F2B]">{currentPage}</span> of {totalPages}
                   </div>

                   {currentPage < totalPages ? (
                     <Link href={`/blog?page=${currentPage + 1}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}${filterCat !== "ALL" ? `&c=${filterCat}` : ''}`} className="w-12 h-12 flex items-center justify-center rounded-full bg-white border border-[#e5e7eb] text-gray-500 hover:text-[#2FA4A9] hover:border-[#2FA4A9] transition-colors shadow-sm">
                       <ChevronRight className="w-5 h-5" />
                     </Link>
                   ) : (
                     <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100 text-gray-300 cursor-not-allowed">
                       <ChevronRight className="w-5 h-5" />
                     </div>
                   )}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
