// ============================================================================
// Hardware Source: src/app/blog/page.tsx
// Route: /blog
// Version: 1.0.0 — 2026-04-08
// Why: Content publishing route for immigration intelligence, long-tail SEO acquisition, and knowledge distribution.
// Domain: Content & SEO
// Env / Identity: React Server Component
// Owner: Verixa Web
// Notes: Keep route behavior deterministic and aligned with metadata, SEO, and access expectations.
// ============================================================================
import { pageMetadata } from "@/lib/seo/metadata";
import { getBlogPosts } from "@/actions/blog.actions";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { BookOpen, Scale, Lightbulb, RefreshCw, Search, ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import ArticleCard from "@/components/blog/ArticleCard";
import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata({
  title: "Canadian Immigration News & Guides",
  description:
    "Plain-language updates on IRCC policy, Express Entry, study and work permits, with links to the official sources and to licensed RCICs who can help.",
  path: "/blog",
});

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
  // Newest first by the date readers see (publish date, else creation).
  const posts = (await getBlogPosts(true)).sort(
    (a, b) => (b.publishedAt ?? b.createdAt).getTime() - (a.publishedAt ?? a.createdAt).getTime()
  );
  
  const sp = await searchParams;
  const filterCat = sp.c || "ALL";
  const searchQuery = sp.q?.toLowerCase() || "";
  const parsedPage = parseInt(sp.page || "1", 10);
  const currentPage = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
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

  const showFeature = currentPage === 1 && filterCat === "ALL" && !searchQuery && paginatedPosts.length > 0;
  const [feature, ...rest] = paginatedPosts;
  const gridPosts = showFeature ? rest : paginatedPosts;

  const pageHref = (n: number) => {
    const params = new URLSearchParams();
    if (n > 1) params.set("page", String(n));
    if (searchQuery) params.set("q", searchQuery);
    if (filterCat !== "ALL") params.set("c", filterCat);
    const qs = params.toString();
    return qs ? `/blog?${qs}` : "/blog";
  };

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-ink">
      <Header />

      {/* ───────────── HERO + SEARCH ───────────── */}
      <section className="border-b border-gray-200 bg-mist pt-28 lg:pt-36">
        <div className="mx-auto max-w-7xl px-6 pb-10 lg:px-8 lg:pb-12">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="flex flex-col gap-4 lg:col-span-7">
              <span className="text-xs font-bold uppercase tracking-wider text-teal">Immigration journal</span>
              <h1 className="text-4xl font-bold leading-tight tracking-tight text-navy md:text-5xl">
                Policy moves weekly. Know before you file.
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-gray-600">
                Policy updates, pathway guides and draw analysis for people planning a move to Canada.
              </p>
            </div>
            <form action="/blog" method="GET" role="search" className="lg:col-span-5">
              {filterCat !== "ALL" && <input type="hidden" name="c" value={filterCat} />}
              <label htmlFor="blog-q" className="sr-only">
                Search articles
              </label>
              <div className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm focus-within:border-teal focus-within:ring-4 focus-within:ring-teal/10 sm:flex-row">
                <div className="flex min-h-12 flex-1 items-center gap-3 px-3">
                  <Search className="h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />
                  <input
                    id="blog-q"
                    type="search"
                    name="q"
                    defaultValue={sp.q ?? ""}
                    placeholder="Topic, program or policy"
                    className="w-full bg-transparent text-base text-ink outline-none placeholder:text-gray-400"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-teal px-6 font-bold text-white transition-colors hover:bg-navy"
                >
                  Search
                </button>
              </div>
            </form>
          </div>

          {/* Category filters */}
          <nav aria-label="Categories" className="-mx-6 mt-8 overflow-x-auto px-6 lg:mx-0 lg:px-0">
            <ul className="flex w-max gap-2 lg:w-auto lg:flex-wrap">
              {CATEGORIES.map((cat) => {
                const isActive = filterCat === cat.value;
                const Icon = cat.icon;
                return (
                  <li key={cat.value}>
                    <Link
                      href={`/blog?c=${cat.value}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
                      aria-current={isActive ? "page" : undefined}
                      className={`inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm font-bold transition-colors ${
                        isActive
                          ? "border-navy bg-navy text-white"
                          : "border-gray-200 bg-white text-gray-600 hover:border-navy hover:text-navy"
                      }`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" /> {cat.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </section>

      {/* ───────────── ARTICLES ───────────── */}
      <section className="flex-1 py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          {searchQuery && (
            <p className="mb-6 text-sm text-gray-600">
              <span className="font-bold text-ink">{filteredPosts.length}</span>{" "}
              {filteredPosts.length === 1 ? "article matches" : "articles match"} &ldquo;{sp.q}&rdquo;
            </p>
          )}

          {filteredPosts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-300 bg-mist px-6 py-16 text-center">
              <BookOpen className="h-10 w-10 text-gray-400" aria-hidden="true" />
              <h2 className="text-lg font-bold text-navy">No articles match yet.</h2>
              <p className="text-sm text-gray-600">Try a broader term, or browse every category.</p>
              <Link
                href="/blog"
                className="mt-2 inline-flex min-h-11 items-center rounded-xl border border-navy bg-white px-5 text-sm font-bold text-navy transition-colors hover:bg-navy hover:text-white"
              >
                Clear filters
              </Link>
            </div>
          ) : (
            <>
              {showFeature && feature && (
                <div className="mb-10">
                  <ArticleCard post={feature} variant="feature" />
                </div>
              )}

              <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {gridPosts.map((post) => (
                  <li key={post.id}>
                    <ArticleCard post={post} />
                  </li>
                ))}
              </ul>

              {totalPages > 1 && (
                <nav className="mt-12 flex items-center justify-center gap-3" aria-label="Pagination">
                  {currentPage > 1 ? (
                    <Link href={pageHref(currentPage - 1)} aria-label="Previous page" className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-navy transition-colors hover:border-navy">
                      <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                    </Link>
                  ) : (
                    <span aria-disabled="true" className="flex h-11 w-11 cursor-not-allowed items-center justify-center rounded-xl border border-gray-200 text-gray-300">
                      <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                    </span>
                  )}
                  <p className="px-3 text-sm font-semibold text-gray-600">
                    Page <span className="font-bold text-navy">{currentPage}</span> of {totalPages}
                  </p>
                  {currentPage < totalPages ? (
                    <Link href={pageHref(currentPage + 1)} aria-label="Next page" className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-navy transition-colors hover:border-navy">
                      <ChevronRight className="h-5 w-5" aria-hidden="true" />
                    </Link>
                  ) : (
                    <span aria-disabled="true" className="flex h-11 w-11 cursor-not-allowed items-center justify-center rounded-xl border border-gray-200 text-gray-300">
                      <ChevronRight className="h-5 w-5" aria-hidden="true" />
                    </span>
                  )}
                </nav>
              )}
            </>
          )}
        </div>
      </section>

      <ConsultantBand />
      <Footer />
    </div>
  );
}

function ConsultantBand() {
  return (
    <section className="mx-auto w-full max-w-7xl px-6 pb-16 lg:px-8">
      <div className="flex flex-col items-start gap-6 rounded-3xl bg-navy p-8 text-white md:flex-row md:items-center md:justify-between md:p-12">
        <div className="flex max-w-2xl flex-col gap-3">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-lightteal">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Licensed consultants only
          </span>
          <h2 className="text-2xl font-bold leading-tight tracking-tight text-white md:text-3xl">
            Read the policy. Then ask someone licensed to apply it to your file.
          </h2>
        </div>
        <Link
          href="/search"
          className="inline-flex min-h-14 shrink-0 items-center justify-center rounded-2xl bg-white px-7 text-lg font-bold text-navy transition-colors hover:bg-teal hover:text-white"
        >
          Find a licensed RCIC
        </Link>
      </div>
    </section>
  );
}
