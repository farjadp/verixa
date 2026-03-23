// ============================================================================
// Hardware Source: blog/category/[category]/page.tsx
// Route: /blog/category/[category]
// Version: 1.0.0 — 2026-03-23
// Why: Route entry for /blog/category/[category] (structured for SEO, trust, and conversion)
// Env / Identity: React Server Component
// Owner: Verixa Web
// Notes: Keep structure consistent; every section must support Traffic -> Trust -> Booking
// ============================================================================

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  blogCategoryMap,
  getBlogPostsByCategory,
  getBlogCategoriesWithCounts
} from "@/lib/blog";

export default function BlogCategoryPage({ params }: { params: { category: string } }) {
  const category = blogCategoryMap.get(params.category);
  if (!category) notFound();

  const posts = getBlogPostsByCategory(category.slug);
  const categories = getBlogCategoriesWithCounts();

  return (
    <div className="space-y-10">
      <div className="bg-white border border-[#e5e7eb] rounded-[28px] p-8 md:p-10">
        <p className="text-xs uppercase tracking-[0.2em] text-[#2FA4A9] font-bold">Category</p>
        <h1 className="text-3xl font-serif font-black mt-3">{category.title}</h1>
        <p className="text-gray-600 mt-2">{category.description}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        {categories.map((cat) => (
          <Link
            key={cat.slug}
            href={`/blog/category/${cat.slug}`}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border transition ${
              cat.slug === category.slug
                ? "bg-[#0F2A44] text-white border-[#0F2A44]"
                : "bg-white text-gray-500 border-gray-200 hover:border-[#2FA4A9]"
            }`}
          >
            {cat.title} ({cat.count})
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="bg-white border border-[#e5e7eb] rounded-[28px] p-6 hover:shadow-md hover:border-[#2FA4A9] transition"
          >
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#2FA4A9] font-bold">
              {category.title}
            </p>
            <h3 className="text-xl font-bold mt-3">{post.title}</h3>
            <p className="text-sm text-gray-600 mt-2">{post.summary[0]}</p>
            <div className="mt-4 text-xs text-gray-400 uppercase tracking-widest">
              {post.publishedAt}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function generateMetadata({ params }: { params: { category: string } }): Metadata {
  const category = blogCategoryMap.get(params.category);
  if (!category) {
    return {
      title: "Blog | Verixa",
      description: "Immigration guides and consultant insights."
    };
  }

  return {
    title: `${category.title} | Verixa Blog`,
    description: category.description
  };
}
