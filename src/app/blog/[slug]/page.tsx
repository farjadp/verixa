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
import { ArrowLeft, Share2, Facebook, Twitter, Linkedin, ChevronDown, Mail, Clock } from "lucide-react";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import PrintButton from "@/components/blog/PrintButton";

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

  // 1. Fetch Dynamic Settings and Widgets
  const [randomSetting, topSetting] = await Promise.all([
    prisma.platformSetting.findUnique({ where: { key: "blogWidgetRandomCount" } }),
    prisma.platformSetting.findUnique({ where: { key: "blogWidgetTopCount" } })
  ]);
  const rLimit = parseInt(randomSetting?.value || "5", 10);
  const tLimit = parseInt(topSetting?.value || "5", 10);

  const allVerified = await prisma.consultantProfile.findMany({
    where: { status: 'VERIFIED' },
    select: { slug: true, fullName: true, city: true, province: true, user: { select: { image: true } } }
  });
  
  const randomConsultants = [...allVerified].sort(() => 0.5 - Math.random()).slice(0, rLimit);
  const topConsultants = [...allVerified].reverse().slice(0, tLimit);

  // 2. Fetch Mid-Roll Related Post
  const allPosts = await getBlogPosts(true);
  const otherPosts = allPosts.filter(p => p.id !== post.id);
  const midRollPost = otherPosts[Math.floor(Math.random() * otherPosts.length)] || null;

  // 3. Process Content and FAQs
  let mainText = post.content;
  let faqText = "";
  
  const faqMatch = post.content.match(/(## FAQ[\s\S]*|## Frequently Asked Questions[\s\S]*)/i);
  if (faqMatch) {
    faqText = faqMatch[0];
    mainText = post.content.replace(faqMatch[0], "");
  }

  const faqs: { q: string, a: string }[] = [];
  if (faqText) {
    const faqLines = faqText.split('\n');
    let currentQ = "";
    let currentA = "";
    for (const line of faqLines) {
      if (line.startsWith("### ")) {
         if (currentQ) faqs.push({ q: currentQ, a: currentA.trim() });
         currentQ = line.replace("### ", "").trim();
         currentA = "";
      } else if (currentQ && line.trim() && !line.startsWith("##")) {
         currentA += line + "\n";
      }
    }
    if (currentQ) faqs.push({ q: currentQ, a: currentA.trim() });
  }

  // 4. Split Main Text for Mid-Roll
  const paragraphs = mainText.split('\n\n');
  const midIndex = Math.floor(paragraphs.length / 2);
  let firstHalf = paragraphs.slice(0, midIndex).join('\n\n');
  let secondHalf = paragraphs.slice(midIndex).join('\n\n');

  // 4.5. Extract Table of Contents (H2 & H3)
  const headings = Array.from(mainText.matchAll(/^(##|###)\s+([^\n]+)$/gm)).map((match, idx) => {
    const text = match[2].trim().replace(/\*/g, '').replace(/_/g, '').replace(/\[|\]|\(.*\)/g, '');
    return {
      level: match[1].length,
      text,
      id: text.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    };
  });

  // 5. Naive Internal Auto-Linking (Safety: Only replacing if not in Markdown syntax)
  const linkDict = [
    { key: "express entry", url: "/search?q=Express+Entry" },
    { key: "rcic", url: "/search" },
    { key: "licensed consultant", url: "/search" }
  ];
  
  linkDict.forEach(link => {
    const regex = new RegExp(`(?<!\\[)(?<!\\()\\b(${link.key})\\b(?!\\])(?!\\))`, 'gi');
    // Only link one occurrence per half to avoid spam
    firstHalf = firstHalf.replace(regex, `[$1](${link.url})`);
    secondHalf = secondHalf.replace(regex, `[$1](${link.url})`);
  });

  const articleUrl = `https://verixa.co/blog/${post.slug}`;
  const wordCount = post.content.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200) || 1;

  // AST Text Extractor for IDs
  const extractText = (children: any): string => {
    if (typeof children === 'string') return children;
    if (Array.isArray(children)) return children.map(extractText).join('');
    if (children && typeof children === 'object' && children.props && children.props.children) {
      return extractText(children.props.children);
    }
    return '';
  };

  const renderHeading = (level: number) => ({ node, children, ...props }: any) => {
    const text = extractText(children).replace(/\*/g, '').replace(/_/g, '').replace(/\[|\]|\(.*\)/g, '');
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const Tag = `h${level}` as any;
    return <Tag id={id} className="scroll-mt-32" {...props}>{children}</Tag>;
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] font-sans flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* ARTICLE HERO - NAVY/TEAL THEME */}
        <section className="bg-[#0F2A44] pt-24 pb-20 px-6 relative overflow-hidden">
          <div className="max-w-5xl mx-auto relative z-10 text-center">
            
            <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-bold text-teal-400 hover:text-white transition-colors mb-8">
              <ArrowLeft className="w-4 h-4" /> Back to Blog
            </Link>

            <div className="flex items-center justify-center gap-4 mb-6">
               <span className="px-3 py-1 bg-[#2FA4A9]/20 text-[#2FA4A9] rounded-full text-[10px] font-black uppercase tracking-widest border border-[#2FA4A9]/40">
                  {post.category.replace(/_/g, " ")}
               </span>
               <span className="text-sm font-medium text-blue-200">
                  {format(new Date(post.publishedAt || post.createdAt), "MMMM d, yyyy")} • {readingTime} min read
               </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-black text-white tracking-tight leading-[1.1] mb-6 max-w-4xl mx-auto">
              {post.title}
            </h1>

            <p className="text-xl md:text-2xl text-blue-200/80 font-light leading-relaxed mb-10 max-w-3xl mx-auto">
              {post.summary}
            </p>

          </div>

          {/* BACKGROUND DECORATION */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-b from-[#2FA4A9] to-transparent rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
        </section>

        {/* COVER IMAGE */}
        {post.coverImage && (
          <section className="max-w-5xl mx-auto px-6 -mt-12 relative z-20">
            <div className="rounded-[32px] overflow-hidden shadow-2xl shadow-black/20 border-4 border-white aspect-[21/9] bg-gray-100">
              <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
            </div>
          </section>
        )}

        {/* CONTENT & SIDEBAR GRID */}
        <section className={`max-w-7xl mx-auto px-6 py-20 ${!post.coverImage ? 'pt-8' : ''}`}>
          <div className="flex flex-col lg:flex-row gap-16">
             
             {/* MAIN ARTICLE BODY */}
             <div className="flex-1 min-w-0">
               {/* INLINE CTA BEFORE CONTENT */}
               <div className="mb-12">
                  <div className="p-5 bg-white border-l-4 border-[#2FA4A9] rounded-r-2xl shadow-sm flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#E5F5F5] text-[#2FA4A9] flex items-center justify-center shrink-0 font-bold font-serif italic text-xl">V</div>
                    <p className="text-[#1A1F2B] leading-relaxed font-medium">
                      <strong>Need personalized help?</strong> Skip the research and connect directly with a licensed RCIC expert on Verixa. <Link href="/search" className="text-[#2FA4A9] underline decoration-2 font-bold hover:text-[#0F2A44] transition-colors">Find your consultant →</Link>
                    </p>
                  </div>
               </div>

               {/* FIRST HALF */}
               <article className="prose prose-lg prose-slate max-w-none prose-headings:font-serif prose-headings:font-black prose-headings:text-[#0F2A44] prose-a:text-[#2FA4A9] prose-a:font-bold prose-a:no-underline hover:prose-a:underline prose-img:rounded-3xl prose-img:shadow-xl">
                 <ReactMarkdown 
                   remarkPlugins={[remarkGfm]}
                   components={{
                     h2: renderHeading(2),
                     h3: renderHeading(3)
                   }}
                 >
                   {firstHalf}
                 </ReactMarkdown>
               </article>

               {/* MID-ROLL RELATED ARTICLE */}
               {midRollPost && (
                 <div className="my-16">
                   <div className="relative overflow-hidden rounded-[32px] bg-[#0F2A44] border border-[#2FA4A9]/30 shadow-2xl group">
                      <div className="absolute inset-0 bg-gradient-to-r from-[#0F2A44] to-[#1a3f63] z-0"></div>
                      <div className="relative z-10 p-10 flex flex-col md:flex-row gap-8 items-center">
                        {midRollPost.coverImage && (
                          <div className="w-full md:w-1/3 aspect-[4/3] rounded-2xl overflow-hidden shadow-lg shrink-0">
                            <img src={midRollPost.coverImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={midRollPost.title} />
                          </div>
                        )}
                        <div className="flex-1">
                          <span className="text-[#2FA4A9] font-black text-xs uppercase tracking-widest mb-3 block">Related Insight</span>
                          <h3 className="text-2xl font-serif font-bold text-white mb-4 leading-snug group-hover:text-[#2FA4A9] transition-colors">{midRollPost.title}</h3>
                          <p className="text-blue-100/70 text-sm line-clamp-2 mb-6">{midRollPost.summary}</p>
                          <Link href={`/blog/${midRollPost.slug}`} className="inline-flex items-center gap-2 bg-[#2FA4A9] hover:bg-[#258d92] text-white px-6 py-3 rounded-full text-sm font-bold transition-transform hover:-translate-y-0.5 shadow-lg shadow-[#2FA4A9]/20">
                            Continue Reading <ArrowLeft className="w-4 h-4 rotate-180" />
                          </Link>
                        </div>
                      </div>
                   </div>
                 </div>
               )}

               {/* SECOND HALF */}
               <article className="prose prose-lg prose-slate max-w-none prose-headings:font-serif prose-headings:font-black prose-headings:text-[#0F2A44] prose-a:text-[#2FA4A9] prose-a:font-bold prose-a:no-underline hover:prose-a:underline prose-img:rounded-3xl prose-img:shadow-xl mt-8">
                 <ReactMarkdown 
                   remarkPlugins={[remarkGfm]}
                   components={{
                     h2: renderHeading(2),
                     h3: renderHeading(3)
                   }}
                 >
                   {secondHalf}
                 </ReactMarkdown>
               </article>

               {/* ACCORDION FAQ */}
               {faqs.length > 0 && (
                 <div className="mt-20 pt-16 border-t border-gray-200">
                    <h2 className="text-3xl font-serif font-black text-[#0F2A44] mb-8">Frequently Asked Questions</h2>
                    <div className="space-y-4">
                      {faqs.map((faq, i) => (
                        <details key={i} className="group bg-white rounded-2xl border border-gray-200 overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                          <summary className="flex items-center justify-between p-6 cursor-pointer bg-white hover:bg-gray-50 transition-colors">
                            <h3 className="font-bold text-[#1A1F2B] pr-4">{faq.q}</h3>
                            <span className="shrink-0 w-8 h-8 rounded-full bg-[#E5F5F5] text-[#2FA4A9] flex items-center justify-center group-open:-rotate-180 transition-transform duration-300">
                              <ChevronDown className="w-5 h-5" />
                            </span>
                          </summary>
                          <div className="p-6 pt-0 text-gray-600 leading-relaxed border-t border-gray-100 bg-white">
                            <ReactMarkdown>{faq.a}</ReactMarkdown>
                          </div>
                        </details>
                      ))}
                    </div>
                 </div>
               )}

             </div>

             {/* DYNAMIC SIDEBAR (Consultants & Navigation) */}
             <aside className="w-full lg:w-[350px] shrink-0 flex flex-col gap-8 lg:sticky lg:top-24 self-start">
               
               {/* BEFORE YOU READ WIDGET */}
               <div className="bg-white rounded-[32px] border border-gray-200 p-8 shadow-sm">
                 <h3 className="text-sm font-black text-[#1A1F2B] uppercase tracking-widest mb-4">Before You Read</h3>
                 <p className="text-sm text-gray-500 leading-relaxed mb-4">{post.summary}</p>
                 <div className="flex items-center gap-2 text-xs font-bold text-[#2FA4A9] bg-[#E5F5F5] px-3 py-2 rounded-lg w-fit">
                   <span>Knowledge Level:</span>
                   <span className="text-[#0F2A44]">Accessible</span>
                 </div>
               </div>

               {/* TABLE OF CONTENTS (ON THIS PAGE) */}
               {headings.length > 0 && (
                 <div className="bg-[#0F2A44] rounded-[32px] p-8 shadow-xl relative overflow-hidden text-white hidden lg:block">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#2FA4A9] rounded-full blur-[50px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
                    
                    <div className="flex items-center justify-between mb-6 relative z-10">
                      <h3 className="text-sm font-black uppercase tracking-widest text-blue-200">On this page</h3>
                      <div className="flex items-center gap-1.5 text-xs font-bold bg-[#2FA4A9] px-2.5 py-1 rounded text-white shadow-sm">
                        <Clock className="w-3 h-3" /> {readingTime} min
                      </div>
                    </div>

                    <nav className="flex flex-col gap-3 relative z-10 text-sm">
                      {headings.map(h => (
                        <a 
                          key={h.id} 
                          href={`#${h.id}`} 
                          className={`hover:text-[#2FA4A9] transition-colors line-clamp-2 ${h.level === 3 ? 'pl-4 text-blue-200/70 border-l border-blue-800' : 'text-blue-100 font-medium'}`}
                        >
                          {h.text}
                        </a>
                      ))}
                    </nav>
                 </div>
               )}

               {/* TOP RATED WIDGET */}
               {topConsultants.length > 0 && (
                 <div className="bg-white rounded-[32px] border border-gray-200 p-8 shadow-sm hidden lg:block">
                   <h3 className="text-xl font-serif font-black text-[#0F2A44] mb-6">Top Rated Consultants</h3>
                   <div className="space-y-6">
                     {topConsultants.map(c => (
                       <Link href={`/${c.slug}`} key={c.slug} className="flex gap-4 group">
                          <div className="w-14 h-14 rounded-full bg-gray-100 border-2 border-white shadow-sm overflow-hidden shrink-0">
                            {c.user?.image ? (
                              <img src={c.user.image} className="w-full h-full object-cover" alt={c.fullName} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-[#0F2A44] text-white font-bold">{c.fullName[0]}</div>
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-[#1A1F2B] group-hover:text-[#2FA4A9] transition-colors">{c.fullName}</h4>
                            <p className="text-xs text-gray-500 mt-1">{c.city}, {c.province}</p>
                            <div className="flex text-yellow-500 mt-1 text-xs">★★★★★</div>
                          </div>
                       </Link>
                     ))}
                   </div>
                   <Link href="/search" className="block w-full text-center mt-8 py-3 rounded-xl bg-[#F5F7FA] text-[#0F2A44] font-bold text-sm hover:bg-[#E5F5F5] hover:text-[#2FA4A9] transition-colors">
                     View All Consultants
                   </Link>
                 </div>
               )}

               {/* RANDOM DISCOVER WIDGET */}
               {randomConsultants.length > 0 && (
                 <div className="bg-[#0F2A44] rounded-[32px] p-8 shadow-xl relative overflow-hidden hidden lg:block">
                   <div className="absolute top-0 right-0 w-40 h-40 bg-[#2FA4A9] rounded-full blur-[60px] opacity-30 -translate-y-1/2 translate-x-1/2"></div>
                   <h3 className="text-xl font-serif font-black text-white mb-6 relative z-10">Discover Experts</h3>
                   <div className="space-y-6 relative z-10">
                     {randomConsultants.map(c => (
                       <Link href={`/${c.slug}`} key={c.slug} className="flex gap-4 group">
                          <div className="w-12 h-12 rounded-full border-2 border-[#2FA4A9] overflow-hidden shrink-0">
                            {c.user?.image ? (
                              <img src={c.user.image} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" alt={c.fullName} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-[#2FA4A9] text-white font-bold text-xs">{c.fullName[0]}</div>
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-white group-hover:text-[#2FA4A9] transition-colors">{c.fullName}</h4>
                            <p className="text-xs text-blue-200/60 mt-0.5">{c.city}, {c.province}</p>
                          </div>
                       </Link>
                     ))}
                   </div>
                 </div>
               )}

               {/* SHARE DESKTOP */}
               <div className="bg-white rounded-[32px] border border-gray-200 p-8 shadow-sm flex flex-col gap-5">
                 <div className="text-center">
                    <h3 className="text-sm font-black text-[#1A1F2B] uppercase tracking-widest mb-1">Export & Share</h3>
                    <p className="text-xs text-gray-400">Help others find the right insights.</p>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-2">
                   <PrintButton />
                   <a href={`mailto:?subject=${encodeURIComponent(post.title)}&body=${encodeURIComponent("Read this great article on Verixa:\n" + articleUrl)}`} className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-xs transition-colors shadow-sm border border-gray-100">
                     <Mail className="w-4 h-4" /> Email
                   </a>
                 </div>

                 <div className="flex justify-center gap-3 mt-2">
                   <a href={`https://twitter.com/intent/tweet?url=${articleUrl}&text=${encodeURIComponent(post.title)}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center bg-gray-50 border border-gray-200 hover:bg-[#2FA4A9] hover:text-white hover:border-transparent rounded-full transition-all text-gray-500"><Twitter className="w-4 h-4" /></a>
                   <a href={`https://www.linkedin.com/shareArticle?mini=true&url=${articleUrl}&title=${encodeURIComponent(post.title)}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center bg-gray-50 border border-gray-200 hover:bg-[#2FA4A9] hover:text-white hover:border-transparent rounded-full transition-all text-gray-500"><Linkedin className="w-4 h-4" /></a>
                   <a href={`https://www.facebook.com/sharer/sharer.php?u=${articleUrl}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center bg-gray-50 border border-gray-200 hover:bg-[#2FA4A9] hover:text-white hover:border-transparent rounded-full transition-all text-gray-500"><Facebook className="w-4 h-4" /></a>
                 </div>
               </div>

             </aside>

          </div>
        </section>

      </main>
      
      <Footer />
    </div>
  );
}
