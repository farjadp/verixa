import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { ArrowRight, BookOpen, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";

export default async function LatestArticles() {
  const articles = await prisma.blogPost.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  if (!articles || articles.length === 0) return null;

  const featured = articles[0];
  const secondary = articles.slice(1);

  return (
    <section className="bg-white py-32 border-t border-gray-100 font-sans">
      <div className="max-w-7xl mx-auto px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="space-y-4 max-w-2xl">
            <h4 className="text-sm font-bold uppercase tracking-widest text-[#2FA4A9] flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Global Insights
            </h4>
            <h2 className="text-5xl font-medium tracking-tight font-serif text-[#1A1F2B]">
              Stay ahead of Canadian Immigration.
            </h2>
            <p className="text-gray-500 text-lg leading-relaxed">
              Expertly curated tactical guides, policy updates, and case-based strategies directly from our verification engine.
            </p>
          </div>
          <Link 
            href="/blog" 
            className="group flex items-center gap-2 font-bold text-[#1A1F2B] border-b-2 border-transparent hover:border-[#0F2A44] pb-1 transition-all whitespace-nowrap"
          >
            Explore the Hub <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Bento Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[600px]">
          
          {/* Main Featured Article (Left - 8 columns) */}
          <Link 
            href={`/blog/${featured.slug}`}
            className="col-span-1 lg:col-span-7 relative rounded-[40px] overflow-hidden group shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer h-full"
          >
            {featured.coverImage ? (
              <Image 
                src={featured.coverImage} 
                alt={featured.title} 
                fill 
                className="object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out" 
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800" />
            )}
            
            {/* Dark Overlay for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F2A44] via-[#0F2A44]/40 to-transparent" />

            <div className="absolute inset-0 p-10 flex flex-col justify-end">
               <div className="flex items-center gap-3 mb-6">
                 <span className="bg-[#2FA4A9] text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg">
                   {featured.category.replace(/_/g, " ")}
                 </span>
                 <span className="text-white/80 text-xs font-semibold flex items-center gap-1.5">
                   <Clock className="w-3.5 h-3.5" /> {format(new Date(featured.createdAt), "MMMM d, yyyy")}
                 </span>
               </div>
               <h3 className="text-3xl md:text-5xl font-serif text-white font-medium mb-4 leading-tight group-hover:text-[#2FA4A9] transition-colors">
                 {featured.title}
               </h3>
               <p className="text-gray-300 line-clamp-2 md:line-clamp-3 max-w-xl text-lg mb-6">
                 {featured.summary}
               </p>
               <div className="flex items-center gap-2 text-white font-bold opacity-0 -translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                 Read Full Brief <ArrowRight className="w-5 h-5" />
               </div>
            </div>
          </Link>

          {/* Secondary Stacked Articles (Right - 4 columns) */}
          <div className="col-span-1 lg:col-span-5 flex flex-col gap-6 h-full">
            {secondary.map((article) => (
               <Link 
                 key={article.id}
                 href={`/blog/${article.slug}`}
                 className="flex-1 relative rounded-[32px] overflow-hidden group shadow-sm hover:shadow-xl transition-all duration-500 bg-gray-50 border border-gray-100"
               >
                 {article.coverImage ? (
                   <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-500">
                      <Image 
                        src={article.coverImage} 
                        alt={article.title} 
                        fill 
                        className="object-cover grayscale" 
                      />
                   </div>
                 ) : null}
                 
                 <div className="absolute inset-0 bg-gradient-to-b from-white/90 to-gray-50/95" />

                 <div className="relative h-full p-8 flex flex-col justify-between z-10">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <span className="bg-[#0F2A44] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                          {article.category.replace(/_/g, " ")}
                        </span>
                        <span className="text-gray-400 text-xs font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {format(new Date(article.createdAt), "MMM d, yyyy")}
                        </span>
                      </div>
                      <h3 className="text-2xl font-serif text-[#1A1F2B] font-medium leading-snug group-hover:text-[#2FA4A9] transition-colors">
                        {article.title}
                      </h3>
                    </div>
                    
                    <div className="mt-6 flex items-center justify-between">
                      <p className="text-gray-500 text-sm line-clamp-2 max-w-[80%]">
                        {article.summary}
                      </p>
                      <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:bg-[#2FA4A9] group-hover:text-white transition-colors border border-gray-100">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                 </div>
               </Link>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
