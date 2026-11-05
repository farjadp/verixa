// ============================================================================
// Hardware Source: src/app/blog/[slug]/page.tsx
// Route: /blog/[slug]
// Version: 1.0.0 — 2026-04-08
// Why: Content publishing route for immigration intelligence, long-tail SEO acquisition, and knowledge distribution.
// Domain: Content & SEO
// Env / Identity: React Server Component
// Owner: Verixa Web
// Notes: Keep route behavior deterministic and aligned with metadata, SEO, and access expectations.
// ============================================================================
import { getBlogPostBySlug, getBlogPosts } from "@/actions/blog.actions";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ConsultantCard from "@/components/home/ConsultantCard";
import { categoryLabel } from "@/components/blog/ArticleCard";
import { parseList, type HomeConsultant } from "@/lib/home-data";
import Link from "next/link";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, ArrowRight, Facebook, Twitter, Linkedin, ChevronDown, Mail, Clock, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import PrintButton from "@/components/blog/PrintButton";
import TrackPageView from "@/components/TrackPageView";
import { buildArticleJsonLd, buildFaqJsonLd, getSiteUrl, serializeJsonLd } from "@/lib/content-pipeline/seo";
import { FAQ_HEADINGS, profileFor } from "@/lib/content-pipeline/language";

const RTL_SCRIPT = /[\u0600-\u06FF]/; // Arabic-script block (Persian)
/** Fisher-Yates copy-shuffle. Per-request randomness for the sidebar and mid-roll picks. */
function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Anchor id for a heading; keeps non-Latin letters so Persian headings get distinct ids. */
const headingId = (text: string) =>
  text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Matches the FAQ heading in any content language (pipeline posts localize it).
const FAQ_HEADING = new RegExp(`## (${FAQ_HEADINGS.map(escapeRe).join("|")})`, "i");

/** Citation URLs saved in a pipeline post's stored JSON-LD, if any. */
function storedCitations(jsonLd: string | null): string[] {
  if (!jsonLd) return [];
  try {
    const parsed = JSON.parse(jsonLd) as { citation?: { url?: unknown }[] };
    return (parsed.citation ?? []).map((c) => c.url).filter((u): u is string => typeof u === "string");
  } catch {
    return [];
  }
}

export async function generateStaticParams() {
  try {
    const posts = await getBlogPosts(true);
    return posts.map(post => ({ slug: post.slug }));
  } catch (err) {
    console.warn("⚠️ Skipping blog static params generation due to DB connection failure during build.");
    return [];
  }
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const resolvedParams = await params;
  const post = await getBlogPostBySlug(resolvedParams.slug);
  
  if (!post || !post.isPublished) return { title: 'Article Not Found | Verixa' };

  const canonical = post.canonicalUrl || `${getSiteUrl()}/blog/${post.slug}`;
  // Pipeline posts store a brand-free seoTitle; the root layout template appends " | Verixa".
  const title = post.source === "PIPELINE" && post.seoTitle ? post.seoTitle : post.seoTitle || `${post.title} | Verixa Insights`;

  return {
    title,
    description: post.seoDesc || post.summary,
    keywords: post.targetKeyword ? [post.targetKeyword] : undefined,
    alternates: { canonical },
    openGraph: {
      title: post.seoTitle || post.title,
      description: post.seoDesc || post.summary,
      url: canonical,
      images: post.coverImage && !post.coverImage.startsWith("data:")
        ? [{ url: post.coverImage, alt: post.imageAlt || post.title }]
        : ['/Brand/Vertixa3.png'],
      type: "article",
      publishedTime: post.publishedAt?.toISOString() || post.createdAt.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
    },
    twitter: { card: "summary_large_image" },
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

  // 1. Sidebar consultants: claimed (identity-verified) profiles, shuffled.
  const randomSetting = await prisma.platformSetting
    .findUnique({ where: { key: "blogWidgetRandomCount" } })
    .catch(() => null);
  const parsedLimit = parseInt(randomSetting?.value || "4", 10);
  const consultantLimit = Number.isNaN(parsedLimit) ? 4 : Math.min(Math.max(parsedLimit, 0), 8);

  let sidebarConsultants: HomeConsultant[] = [];
  try {
    const pool = await prisma.consultantProfile.findMany({
      where: { userId: { not: null }, status: { not: "PENDING" } },
      orderBy: { updatedAt: "desc" },
      take: 40,
      select: {
        licenseNumber: true,
        fullName: true,
        company: true,
        city: true,
        province: true,
        avatarImage: true,
        languages: true,
        userId: true,
      },
    });
    sidebarConsultants = shuffle(pool)
      .slice(0, consultantLimit)
      .map((c) => ({
        licenseNumber: c.licenseNumber,
        fullName: c.fullName,
        company: c.company,
        city: c.city,
        province: c.province,
        avatarImage: c.avatarImage,
        languages: parseList(c.languages).slice(0, 2),
        claimed: c.userId !== null,
      }));
  } catch (err) {
    console.error("Blog article: consultant sidebar failed", err);
  }

  // 2. Fetch Mid-Roll Related Post
  const allPosts = await getBlogPosts(true);
  const otherPosts = allPosts.filter(p => p.id !== post.id);
  const midRollPost = shuffle(otherPosts)[0] ?? null;

  // 3. Process Content and FAQs
  let mainText = post.content;
  let faqText = "";
  let disclaimerText = "";
  
  const faqStartIndex = mainText.search(FAQ_HEADING);
  if (faqStartIndex !== -1) {
    const afterFaqStart = mainText.substring(faqStartIndex);
    const endMatch = afterFaqStart.match(/(<end-of-faq>|---)/);
    
    if (endMatch && endMatch.index !== undefined) {
       faqText = afterFaqStart.substring(0, endMatch.index);
       disclaimerText = afterFaqStart.substring(endMatch.index).replace('<end-of-faq>', '').trim();
       disclaimerText = disclaimerText.replace(/^---?\s*/, '').trim(); // Remove horizontal rule
       mainText = mainText.substring(0, faqStartIndex).trim();
    } else {
       faqText = afterFaqStart;
       mainText = mainText.substring(0, faqStartIndex).trim();
    }
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
      id: headingId(text)
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

  const articleUrl = `${getSiteUrl()}/blog/${post.slug}`;
  const wordCount = post.content.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200) || 1;

  // Structured data for every post (Article + FAQ). Built from current fields so
  // datePublished reflects the real publish time, not draft creation.
  // Pipeline posts store their language; older posts fall back to script detection.
  const lang = profileFor(post.language || (RTL_SCRIPT.test(post.title) ? "fa" : "en"));
  const isRtl = lang.dir === "rtl";
  const articleJsonLd = serializeJsonLd(
    buildArticleJsonLd({
      title: post.title,
      description: post.seoDesc || post.summary,
      slug: post.slug,
      image: post.coverImage,
      imageAlt: post.imageAlt,
      datePublished: post.publishedAt || post.createdAt,
      dateModified: post.updatedAt,
      keywords: post.targetKeyword ? [post.targetKeyword] : undefined,
      inLanguage: lang.code,
      citations: storedCitations(post.jsonLd),
      section: post.category.replace(/_/g, " "),
    })
  );
  const faqLd = buildFaqJsonLd(faqs);
  const faqJsonLd = faqLd ? serializeJsonLd(faqLd) : null;

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
    const id = headingId(text);
    const Tag = `h${level}` as any;
    return <Tag id={id} className="scroll-mt-32" {...props}>{children}</Tag>;
  };

  const markdownComponents = {
    h2: renderHeading(2),
    h3: renderHeading(3),
    table: ({ node, ...props }: any) => <div className="not-prose my-10 w-full overflow-x-auto rounded-2xl border border-gray-200"><table className="w-full border-collapse text-start" {...props} /></div>,
    th: ({ node, ...props }: any) => <th className="border-b border-gray-200 bg-mist px-4 py-3 text-start align-top text-sm font-bold leading-snug text-navy" {...props} />,
    td: ({ node, ...props }: any) => <td className="border-b border-gray-100 px-4 py-3 align-top text-sm leading-relaxed text-gray-700 md:text-base" {...props} />,
    tr: ({ node, ...props }: any) => <tr {...props} />,
    blockquote: ({ node, ...props }: any) => <blockquote className="my-8 rounded-e-2xl border-s-4 border-teal bg-mist p-6 font-medium not-italic text-navy" {...props} />
  };

  const proseClass =
    "prose prose-lg max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-navy prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-ink prose-a:font-semibold prose-a:text-teal prose-a:no-underline hover:prose-a:underline prose-img:rounded-2xl";
  const publishedOn = post.publishedAt || post.createdAt;

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-ink">
      <TrackPageView eventName="article_view" articleId={post.id} />
      {/* JSON-LD is serialized with "<" escaped, so post content can't break out of the script tag. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: articleJsonLd }} />
      {faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd }} />}
      <Header />

      <main className="flex-1">
        {/* ───────────── ARTICLE HERO ───────────── */}
        <section className="border-b border-gray-200 bg-mist pt-28 lg:pt-36">
          <div className="mx-auto max-w-7xl px-6 pb-10 lg:px-8 lg:pb-12">
            <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-sm text-gray-500">
              <Link href="/blog" className="inline-flex items-center gap-1.5 font-semibold text-teal hover:text-navy">
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" /> Immigration journal
              </Link>
              <span aria-hidden="true">/</span>
              <span>{categoryLabel(post.category)}</span>
            </nav>

            <div className="flex max-w-4xl flex-col gap-5" dir={isRtl ? "rtl" : undefined} lang={lang.code}>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded bg-teal/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-teal">
                  {categoryLabel(post.category)}
                </span>
                <time dateTime={publishedOn.toISOString()} className="font-semibold text-gray-600">
                  {format(new Date(publishedOn), "MMMM d, yyyy")}
                </time>
                <span className="inline-flex items-center gap-1 text-gray-500">
                  <Clock className="h-4 w-4" aria-hidden="true" /> {readingTime} min read
                </span>
              </div>
              <h1 className="text-3xl font-bold leading-tight tracking-tight text-navy sm:text-4xl md:text-5xl">
                {post.title}
              </h1>
              <p className="text-lg leading-relaxed text-gray-600 md:text-xl">{post.summary}</p>
            </div>
          </div>
        </section>

        {/* ───────────── COVER IMAGE ───────────── */}
        {post.coverImage && (
          <div className="mx-auto max-w-7xl px-6 pt-8 lg:px-8 lg:pt-10">
            <div className="aspect-[21/9] overflow-hidden rounded-3xl bg-mist">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.coverImage} alt={post.imageAlt || post.title} className="h-full w-full object-cover" />
            </div>
          </div>
        )}

        {/* ───────────── CONTENT + SIDEBAR ───────────── */}
        <section className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
          <div className="flex flex-col gap-12 lg:flex-row lg:gap-16">
            {/* MAIN ARTICLE BODY */}
            <div className="min-w-0 flex-1" dir={isRtl ? "rtl" : undefined} lang={lang.code}>
              <article className={proseClass}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents as any}>
                  {firstHalf}
                </ReactMarkdown>
              </article>

              {/* MID-ROLL RELATED ARTICLE */}
              {midRollPost && (
                <aside className="my-12" aria-label="Related article" dir="ltr">
                  <Link
                    href={`/blog/${midRollPost.slug}`}
                    className="group flex flex-col gap-5 rounded-2xl border border-gray-200 bg-mist p-5 transition-shadow hover:shadow-lg hover:shadow-navy/5 sm:flex-row sm:items-center"
                  >
                    {midRollPost.coverImage && (
                      <div className="aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl sm:w-48">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={midRollPost.coverImage} alt="" className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-teal">Related brief</span>
                      <p className="text-lg font-bold leading-snug text-navy group-hover:text-teal">{midRollPost.title}</p>
                      <p className="line-clamp-2 text-sm text-gray-600">{midRollPost.summary}</p>
                    </div>
                    <ArrowRight className="hidden h-5 w-5 shrink-0 text-gray-400 group-hover:text-teal rtl:rotate-180 sm:block" aria-hidden="true" />
                  </Link>
                </aside>
              )}

              {/* SECOND HALF */}
              <article className={proseClass}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents as any}>
                  {secondHalf}
                </ReactMarkdown>
              </article>

              {/* DISCLAIMER */}
              {disclaimerText && (
                <div className="mt-12 rounded-2xl border border-gray-200 bg-mist p-6 text-sm leading-relaxed text-gray-600">
                  <ReactMarkdown>{disclaimerText}</ReactMarkdown>
                </div>
              )}

              {/* FAQ */}
              {faqs.length > 0 && (
                <div className="mt-14 border-t border-gray-200 pt-12">
                  <h2 className="mb-6 text-2xl font-bold tracking-tight text-navy md:text-3xl">{lang.labels.faq}</h2>
                  <div className="flex flex-col gap-3">
                    {faqs.map((faq, i) => (
                      <details key={i} className="group overflow-hidden rounded-2xl border border-gray-200 bg-white [&_summary::-webkit-details-marker]:hidden">
                        <summary className="flex cursor-pointer items-center justify-between gap-4 p-5 transition-colors hover:bg-mist">
                          <h3 className="font-bold text-ink">{faq.q}</h3>
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal/10 text-teal transition-transform duration-300 group-open:-rotate-180">
                            <ChevronDown className="h-5 w-5" aria-hidden="true" />
                          </span>
                        </summary>
                        <div className="border-t border-gray-100 p-5 leading-relaxed text-gray-700">
                          <ReactMarkdown>{faq.a}</ReactMarkdown>
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ───────────── SIDEBAR ───────────── */}
            <aside className="flex w-full shrink-0 flex-col gap-6 self-start lg:w-80">
              {/* ON THIS PAGE */}
              {headings.length > 0 && (
                <nav
                  aria-label="On this page"
                  className="hidden rounded-2xl border border-gray-200 bg-white p-6 lg:block"
                  dir={isRtl ? "rtl" : undefined}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-teal">On this page</h2>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {readingTime} min
                    </span>
                  </div>
                  <ul className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto text-sm">
                    {headings.map((h) => (
                      <li key={h.id}>
                        <a
                          href={`#${h.id}`}
                          className={`line-clamp-2 transition-colors hover:text-teal ${
                            h.level === 3 ? "border-s border-gray-200 ps-3 text-gray-500" : "font-semibold text-navy"
                          }`}
                        >
                          {h.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}

              {/* LICENSED CONSULTANTS */}
              <div className="rounded-2xl border border-gray-200 bg-mist p-6">
                <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Licensed RCICs
                </p>
                <h2 className="mt-2 text-lg font-bold leading-snug text-navy">Need this applied to your file?</h2>
                <p className="mt-1 text-sm text-gray-600">
                  An article can&apos;t assess your case. A licensed consultant can.
                </p>
                {sidebarConsultants.length > 0 && (
                  <ul className="mt-5 flex flex-col gap-3">
                    {sidebarConsultants.map((c) => (
                      <li key={c.licenseNumber}>
                        <ConsultantCard consultant={c} variant="mini" />
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  href="/search"
                  className="mt-5 flex min-h-11 items-center justify-center rounded-xl bg-navy px-4 text-sm font-bold text-white transition-colors hover:bg-teal"
                >
                  Find a licensed RCIC
                </Link>
              </div>

              {/* SHARE */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-teal">Save &amp; share</h2>
                <div className="grid grid-cols-2 gap-2">
                  <PrintButton />
                  <a
                    href={`mailto:?subject=${encodeURIComponent(post.title)}&body=${encodeURIComponent("Read this article on Verixa:\n" + articleUrl)}`}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-navy transition-colors hover:border-navy"
                  >
                    <Mail className="h-4 w-4" aria-hidden="true" /> Email
                  </a>
                </div>
                <div className="mt-3 flex gap-2">
                  {[
                    { label: "Share on X", href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(articleUrl)}&text=${encodeURIComponent(post.title)}`, icon: <Twitter className="h-4 w-4" aria-hidden="true" /> },
                    { label: "Share on LinkedIn", href: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(articleUrl)}&title=${encodeURIComponent(post.title)}`, icon: <Linkedin className="h-4 w-4" aria-hidden="true" /> },
                    { label: "Share on Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`, icon: <Facebook className="h-4 w-4" aria-hidden="true" /> },
                  ].map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition-colors hover:border-navy hover:text-navy"
                    >
                      {s.icon}
                    </a>
                  ))}
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
