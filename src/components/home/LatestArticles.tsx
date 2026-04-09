import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { ArrowUpRight, Clock, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { isDatabaseUnavailable, markDatabaseUnavailable } from "@/lib/db-availability";

type LatestArticle = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  coverImage: string | null;
  createdAt: Date;
};

export default async function LatestArticles() {
  if (isDatabaseUnavailable()) {
    return null;
  }

  let articles: LatestArticle[] = [];
  try {
    articles = await prisma.blogPost.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        category: true,
        coverImage: true,
        createdAt: true,
      },
    });
  } catch (err) {
    markDatabaseUnavailable(err);
    console.warn("⚠️ Skipping LatestArticles rendering due to DB connection failure during build.");
    return null;
  }

  if (!articles || articles.length === 0) return null;

  const featured = articles[0];
  const sideArticles = articles.slice(1);

  return (
    <section className="bg-[#0F2A44] text-white py-32 font-sans relative overflow-hidden border-y-[6px] border-[#2FA4A9]/20">
      
      {/* Background Glowing Effects */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-[#2FA4A9] via-[#2FA4A9]/20 to-transparent rounded-full blur-[120px] opacity-10 pointer-events-none -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-[#2FA4A9] via-[#2FA4A9]/20 to-transparent rounded-full blur-[100px] opacity-10 pointer-events-none translate-y-1/2 -translate-x-1/3" />

      <div className="max-w-7xl mx-auto px-8 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
          <div className="space-y-6 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#2FA4A9] border border-[#2FA4A9]/30 bg-[#2FA4A9]/10 rounded-full px-4 py-1.5 shadow-[0_0_15px_rgba(47,164,169,0.2)]">
              <Sparkles className="w-4 h-4" /> The Auto-Pilot Engine
            </div>
            <h2 className="text-5xl md:text-6xl font-black font-serif tracking-tight leading-[1.1] text-white Drop-shadow-lg">
              Insights that <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-[#2FA4A9] to-blue-500">Accelerate</span> <br/> Your Future.
            </h2>
            <p className="text-blue-200/80 text-lg leading-relaxed font-light">
              Dive into our AI-driven intelligence hub. We analyze the latest Canadian Immigration trends, policies, and systems to give you a definitive edge.
            </p>
          </div>
          <Link 
            href="/blog" 
            className="group flex items-center justify-center gap-3 bg-white text-[#0F2A44] font-black uppercase tracking-wider text-xs px-8 py-4 rounded-full shadow-[0_10px_40px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_10px_50px_-10px_rgba(255,255,255,0.5)] hover:-translate-y-1 transition-all duration-300"
          >
            Access All Briefs <ArrowUpRight className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
          </Link>
        </div>

        {/* Premium Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* HUGE HERO ARTICLE (8 Cols) */}
          <Link 
            href={`/blog/${featured.slug}`}
            className="col-span-1 lg:col-span-8 relative rounded-[40px] overflow-hidden group border border-white/10 shadow-2xl h-[500px] lg:h-full block transform-gpu"
          >
            {/* Image & Gradient Backdrop */}
            {featured.coverImage ? (
              <Image 
                src={featured.coverImage} 
                alt={featured.title} 
                fill 
                className="object-cover group-hover:scale-105 transition-transform duration-1000 ease-out saturate-50 group-hover:saturate-100 mix-blend-overlay" 
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-[#0F2A44]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F2A44] via-[#0F2A44]/70 to-transparent opacity-90 group-hover:opacity-70 transition-opacity duration-700" />

            {/* Glowing Accent */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 shadow-[inset_0_0_100px_rgba(47,164,169,0.3)] pointer-events-none" />

            {/* Content Payload */}
            <div className="relative z-10 p-10 md:p-14 flex flex-col justify-end h-full">
               <div className="mt-auto">
                 <div className="flex items-center gap-3 mb-6">
                   <span className="bg-[#2FA4A9] text-white text-[10px] font-black uppercase tracking-[0.15em] px-4 py-1.5 rounded-full shadow-lg border border-[#2FA4A9]/50 backdrop-blur-md">
                     {featured.category.replace(/_/g, " ")}
                   </span>
                   <span className="text-white/70 text-xs font-bold flex items-center gap-1.5 backdrop-blur-sm bg-black/20 px-3 py-1.5 rounded-full border border-white/5">
                     <Clock className="w-3 h-3" /> {format(new Date(featured.createdAt), "MMMM d, yyyy")}
                   </span>
                 </div>
                 <h3 className="text-4xl md:text-5xl lg:text-5xl font-serif text-white font-black leading-[1.1] group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-blue-200 transition-all duration-300 line-clamp-3 lg:line-clamp-2">
                   {featured.title}
                 </h3>
                 <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-700 ease-in-out opacity-0 group-hover:opacity-100">
                   <div className="overflow-hidden">
                     <p className="text-blue-100/70 line-clamp-2 max-w-2xl text-lg font-light mt-6 mb-8">
                       {featured.summary}
                     </p>
                     <div className="flex items-center gap-3 text-teal-300 font-bold uppercase tracking-widest text-xs pb-2">
                       Read Intelligence Brief <ArrowUpRight className="w-4 h-4" />
                     </div>
                   </div>
                 </div>
               </div>
            </div>
          </Link>

          {/* STACKED SIDE ARTICLES (4 Cols) */}
          <div className="col-span-1 lg:col-span-4 flex flex-col gap-6 lg:h-full">
            {sideArticles.map((article) => (
               <Link 
                 key={article.id}
                 href={`/blog/${article.slug}`}
                 className="flex-1 relative rounded-[32px] overflow-hidden group shadow-xl hover:shadow-2xl transition-all duration-500 border border-white/10 bg-white/5 backdrop-blur-3xl min-h-[250px] flex flex-col"
               >
                 {/* Optional Glassmorphic Image Hint */}
                 {article.coverImage && (
                   <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                      <Image 
                        src={article.coverImage} 
                        alt={article.title} 
                        fill 
                        className="object-cover mix-blend-luminosity scale-110 group-hover:scale-100 transition-transform duration-1000" 
                      />
                   </div>
                 )}
                 
                 <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                 <div className="relative flex-1 p-8 flex flex-col justify-between z-10">
                    <div>
                      <div className="flex items-center gap-3 mb-5">
                        <span className="bg-white/10 text-teal-300 text-[9px] font-black uppercase tracking-[0.15em] px-3 py-1.5 rounded-full border border-white/5">
                          {article.category.replace(/_/g, " ")}
                        </span>
                      </div>
                      <h3 className="text-2xl font-serif text-white font-bold leading-tight group-hover:text-teal-300 transition-colors line-clamp-3">
                        {article.title}
                      </h3>
                    </div>
                    
                    <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-6">
                      <div className="text-blue-200/50 text-xs font-bold flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" /> {format(new Date(article.createdAt), "MMM d")}
                      </div>
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-teal-400 group-hover:text-[#0F2A44] transition-colors border border-white/10 shadow-[0_0_15px_rgba(47,164,169,0)] group-hover:shadow-[0_0_20px_rgba(47,164,169,0.5)]">
                        <ArrowUpRight className="w-4 h-4" />
                      </div>
                    </div>
                 </div>
               </Link>
            ))}

            {/* Add an empty placeholder if less than 3 total articles exist */}
            {sideArticles.length < 2 && (
              <div className="flex-1 rounded-[32px] border border-dashed border-white/20 bg-white/5 flex flex-col items-center justify-center p-8 text-center min-h-[250px]">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <Sparkles className="w-5 h-5 text-teal-400/50" />
                </div>
                <p className="text-blue-200/50 text-sm font-medium">Auto-Pilot is generating more intelligence...</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}
