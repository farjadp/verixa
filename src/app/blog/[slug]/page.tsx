// ============================================================================
// Hardware Source: app/blog/[slug]/page.tsx
// Route: /blog/[slug]
// Version: 1.0.0 — 2026-03-23
// Why: The ultimate Conversion URL. Structured for AEO/GEO via semantic HTML.
// ============================================================================

import { getBlogPostBySlug, getBlogPosts } from "@/actions/blog.actions";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ArticleCTA from "@/components/blog/ArticleCTA";
import Link from "next/link";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Share2, Facebook, Twitter, Linkedin } from "lucide-react";
import type { Metadata } from "next";

export async function generateStaticParams() {
  const posts = await getBlogPosts(true);
  return posts.map(post => ({ slug: post.slug }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const resolvedParams = await params;
  const post = await getBlogPostBySlug(resolvedParams.slug);
  
  if (!post || !post.isPublished) return { title: 'Article Not Found | Verixa' };
  
  return {
    title: post.seoTitle || `${post.title} | Verixa Insights`,
    description: post.seoDesc || post.summary,
    openGraph: {
      title: post.seoTitle || post.title,
      description: post.seoDesc || post.summary,
      images: post.coverImage ? [post.coverImage] : ['/Brand/Vertixa3.png'],
      type: "article",
      publishedTime: post.publishedAt?.toISOString() || post.createdAt.toISOString()
    }
  };
}

export default async function BlogPostPage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const resolvedParams = await params;
  const post = await getBlogPostBySlug(resolvedParams.slug);

  if (!post || !post.isPublished) {
    notFound();
  }

  // The Share URL
  const articleUrl = `https://verixa.co/blog/${post.slug}`;

  // Read time estimation (roughly 200 words per minute)
  const wordCount = post.content.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200);

  return (
    <div className="min-h-screen bg-[#FDFCFB] font-sans flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* ARTICLE HERO */}
        <section className="bg-white border-b border-[#f5ecd8] pt-24 pb-16 px-6 relative overflow-hidden">
          <div className="max-w-4xl mx-auto relative z-10">
            
            <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-[#C29967] transition-colors mb-8">
              <ArrowLeft className="w-4 h-4" /> Back to Intelligence
            </Link>

            <div className="flex items-center gap-4 mb-6">
               <span className="px-3 py-1 bg-[#1A1A1A] text-[#C29967] rounded-full text-[10px] font-black uppercase tracking-widest">
                  {post.category.replace(/_/g, " ")}
               </span>
               <span className="text-sm font-medium text-gray-400">
                  {format(new Date(post.publishedAt || post.createdAt), "MMMM d, yyyy")} • {readingTime} min read
               </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-black text-[#1A1A1A] tracking-tight leading-[1.1] mb-6">
              {post.title}
            </h1>

            <p className="text-xl md:text-2xl text-gray-500 font-light leading-relaxed mb-10 max-w-3xl">
              {post.summary}
            </p>

            <div className="flex items-center gap-4 py-6 border-t border-gray-100">
               <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Share Insight:</span>
               <div className="flex gap-2 text-gray-400">
                 <a href={`https://twitter.com/intent/tweet?url=${articleUrl}&text=${encodeURIComponent(post.title)}`} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-gray-100 rounded-full transition-colors"><Twitter className="w-5 h-5" /></a>
                 <a href={`https://www.linkedin.com/shareArticle?mini=true&url=${articleUrl}&title=${encodeURIComponent(post.title)}`} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-gray-100 rounded-full transition-colors"><Linkedin className="w-5 h-5" /></a>
                 <a href={`https://www.facebook.com/sharer/sharer.php?u=${articleUrl}`} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-gray-100 rounded-full transition-colors"><Facebook className="w-5 h-5" /></a>
               </div>
            </div>

          </div>

          {/* BACKGROUND DECORATION */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-b from-[#F6F3F0] to-transparent rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
        </section>

        {/* COVER IMAGE */}
        {post.coverImage && (
          <section className="max-w-6xl mx-auto px-6 -mt-8 relative z-20">
            <div className="rounded-3xl overflow-hidden shadow-2xl shadow-black/10 border border-[#f5ecd8] aspect-[21/9] bg-gray-100">
              <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
            </div>
          </section>
        )}

        {/* ARTICLE CONTENT */}
        <section className={`px-6 py-20 ${!post.coverImage ? 'pt-8' : ''}`}>
          <div className="max-w-3xl mx-auto">
            
            {/* INLINE CTA BEFORE CONTENT */}
            <div className="mb-12">
               <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3">
                 <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 font-bold font-serif italic text-lg">V</div>
                 <p className="text-sm text-orange-800 leading-relaxed font-medium">
                   <strong>Looking for direct answers?</strong> Skip the manual research and consult directly with a verified RCIC expert on Verixa. <Link href="/search" className="underline font-bold hover:text-black">Find your consultant →</Link>
                 </p>
               </div>
            </div>

            {/* FULL MDX ENGINE RENDERING */}
            <article className="prose prose-lg md:prose-xl prose-stone max-w-none prose-headings:font-serif prose-headings:font-black prose-a:text-[#C29967] prose-a:no-underline hover:prose-a:underline prose-img:rounded-3xl prose-img:shadow-xl">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {post.content}
              </ReactMarkdown>
            </article>

            {/* END ARTICLE HIGH CONVERTING CTA */}
            <ArticleCTA />
            
          </div>
        </section>

      </main>
      
      <Footer />
    </div>
  );
}
