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
import { BookOpen } from "lucide-react";
import ArticleCard from "@/components/blog/ArticleCard";
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

export default async function BlogCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  // Next 16 passes params as a Promise; reading it synchronously made every archive 404.
  const { category } = await params;
  const meta = categoryMap[category as keyof typeof categoryMap];
  if (!meta) notFound();

  const allPosts = await getBlogPosts(true);
  const posts = allPosts
    .filter((p) => p.category === meta.enum)
    .sort((a, b) => (b.publishedAt ?? b.createdAt).getTime() - (a.publishedAt ?? a.createdAt).getTime());

  const categoriesWithCounts = Object.entries(categoryMap).map(([slug, data]) => ({
    slug,
    title: data.title,
    count: allPosts.filter((p) => p.category === data.enum).length,
  }));

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-ink">
      <Header />

      <section className="border-b border-gray-200 bg-mist pt-28 lg:pt-36">
        <div className="mx-auto max-w-7xl px-6 pb-10 lg:px-8 lg:pb-12">
          <nav aria-label="Breadcrumb" className="mb-4 text-sm text-gray-500">
            <Link href="/blog" className="font-semibold text-teal hover:text-navy">
              Immigration journal
            </Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <span>{meta.title}</span>
          </nav>
          <div className="flex max-w-3xl flex-col gap-4">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-navy md:text-5xl">{meta.title}</h1>
            <p className="text-lg leading-relaxed text-gray-600">{meta.desc}</p>
            <p className="text-sm font-semibold text-gray-500">
              {posts.length} {posts.length === 1 ? "article" : "articles"}
            </p>
          </div>

          <nav aria-label="Categories" className="-mx-6 mt-8 overflow-x-auto px-6 lg:mx-0 lg:px-0">
            <ul className="flex w-max gap-2 lg:w-auto lg:flex-wrap">
              <li>
                <Link
                  href="/blog"
                  className="inline-flex min-h-10 items-center whitespace-nowrap rounded-full border border-gray-200 bg-white px-4 text-sm font-bold text-gray-600 transition-colors hover:border-navy hover:text-navy"
                >
                  All topics ({allPosts.length})
                </Link>
              </li>
              {categoriesWithCounts.map((cat) => {
                const active = cat.slug === category;
                return (
                  <li key={cat.slug}>
                    <Link
                      href={`/blog/category/${cat.slug}`}
                      aria-current={active ? "page" : undefined}
                      className={`inline-flex min-h-10 items-center whitespace-nowrap rounded-full border px-4 text-sm font-bold transition-colors ${
                        active
                          ? "border-navy bg-navy text-white"
                          : "border-gray-200 bg-white text-gray-600 hover:border-navy hover:text-navy"
                      }`}
                    >
                      {cat.title} ({cat.count})
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </section>

      <main className="flex-1 py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          {posts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-300 bg-mist px-6 py-16 text-center">
              <BookOpen className="h-10 w-10 text-gray-400" aria-hidden="true" />
              <h2 className="text-lg font-bold text-navy">No articles published yet.</h2>
              <p className="text-sm text-gray-600">Check back soon for new {meta.title.toLowerCase()}.</p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <li key={post.slug}>
                  <ArticleCard post={post} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
