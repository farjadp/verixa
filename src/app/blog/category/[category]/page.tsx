// ============================================================================
// Hardware Source: src/app/blog/category/[category]/page.tsx
// Route: /blog/category/[category]
// Version: 1.0.0 — 2026-04-08
// Why: Content publishing route for immigration intelligence, long-tail SEO acquisition, and knowledge distribution.
// Domain: Content & SEO
// Env / Identity: React Server Component
// Owner: Verixa Web
// Notes: Keep route behavior deterministic and aligned with metadata, SEO, and access expectations.
// ============================================================================
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBlogPosts } from "@/actions/blog.actions";
import { format } from "date-fns";
import { ArrowRight, BookOpen } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Maps generic slugs to Prisma Engine Enums
const categoryMap = {
  "immigration-guides": { enum: "IMMIGRATION_GUIDES", title: "Immigration Guides", desc: "Step-by-step frameworks for Canadian immigration pathways." },
  "consultant-insights": { enum: "CONSULTANT_INSIGHTS", title: "Consultant Insights", desc: "Expert strategies and proven advice from top RCICs." },
  "case-based-content": { enum: "CASE_BASED_CONTENT", title: "Case-Based Scenarios", desc: "Real-world immigration cases dismantled and explained." },
  "updates-policy": { enum: "UPDATES_POLICY", title: "Updates & Policy", desc: "Breaking IRCC news and regulatory changes." }
};

export async function generateMetadata({ params }: { params: { category: string } }): Promise<Metadata> {
  const cat = categoryMap[params.category as keyof typeof categoryMap];
  if (!cat) return { title: "Blog | Verixa", description: "Immigration guides and consultant insights." };
  return { title: `${cat.title} | Verixa Blog`, description: cat.desc };
}

export default async function BlogCategoryPage({ params }: { params: { category: string } }) {
  const meta = categoryMap[params.category as keyof typeof categoryMap];
  if (!meta) notFound();

  // Async data fetch replacing the missing lib logic natively interfacing with the CMS
  const allPosts = await getBlogPosts(true);
  const posts = allPosts.filter(p => p.category === meta.enum);
  
  // Calculate counts dynamically from Prisma
  const categoriesWithCounts = Object.entries(categoryMap).map(([slug, data]) => ({
    slug,
    title: data.title,
    count: allPosts.filter(p => p.category === data.enum).length
  }));

  return (
    <div className="min-h-screen bg-[#F5F7FA] font-sans flex flex-col">
      <Header />
      
      <main className="flex-1 py-32 px-6">
        <div className="max-w-6xl mx-auto space-y-10">
          
          <div className="bg-white border border-[#e5e7eb] rounded-[32px] p-10 md:p-16 text-center shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-[#2FA4A9] font-black">Category Archive</p>
            <h1 className="text-4xl md:text-5xl font-serif font-black mt-4 text-[#0F2A44] leading-tight">{meta.title}</h1>
            <p className="text-gray-500 mt-4 text-lg max-w-2xl mx-auto">{meta.desc}</p>
          </div>

          {/* Categories Navigation */}
          <div className="flex flex-wrap justify-center gap-3">
            <Link 
              href="/blog" 
              className="px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest border transition bg-white text-gray-500 border-gray-200 hover:border-[#2FA4A9]"
            >
              All Topics ({allPosts.length})
            </Link>
            {categoriesWithCounts.map((cat) => (
              <Link
                key={cat.slug}
                href={`/blog/category/${cat.slug}`}
                className={`px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest border transition ${
                  cat.slug === params.category
                    ? "bg-[#0F2A44] text-white border-[#0F2A44] shadow-lg shadow-[#0F2A44]/10"
                    : "bg-white text-gray-500 border-gray-200 hover:border-[#2FA4A9]"
                }`}
              >
                {cat.title} ({cat.count})
              </Link>
            ))}
          </div>

          {/* Posts Grid */}
          {posts.length === 0 ? (
            <div className="text-center py-24 border-2 border-dashed border-[#e5e7eb] rounded-3xl bg-white">
              <BookOpen className="w-12 h-12 text-[#e5e7eb] mx-auto mb-4" />
              <h3 className="text-xl font-bold tracking-tight text-[#1A1F2B] mb-2">No articles published yet.</h3>
              <p className="text-gray-400 font-medium">Check back soon for the latest {meta.title.toLowerCase()} updates.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group bg-white border border-[#e5e7eb] rounded-[32px] overflow-hidden hover:shadow-2xl hover:shadow-[#2FA4A9]/10 transition-all duration-300 flex flex-col relative"
                >
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
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  </div>

                  <div className="p-8 flex-1 flex flex-col relative z-10 bg-white">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#2FA4A9] bg-[#2FA4A9]/10 px-3 py-1 rounded-full">
                        {meta.title}
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
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
