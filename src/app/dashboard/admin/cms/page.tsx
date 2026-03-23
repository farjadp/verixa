// ============================================================================
// Hardware Source: dashboard/admin/cms/page.tsx
// Route: /dashboard/admin/cms
// Version: 1.0.0 — 2026-03-23
// Why: Route entry for /dashboard/admin/cms (structured for SEO, trust, and conversion)
// Env / Identity: React Server Component
// Owner: Verixa Web
// Notes: Keep structure consistent; every section must support Traffic -> Trust -> Booking
// ============================================================================

import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { blogCategories, blogPosts } from "@/lib/blog";

export default async function CmsPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    redirect("/dashboard");
  }

  const template = `Write a high-quality blog article for Verixa, a marketplace for licensed immigration consultants in Canada.

Structure:
- H1 title (clear, SEO-friendly)
- 3–4 line summary
- Table of contents
- Direct answer section
- Deep explanation
- Step-by-step guidance
- Risks and mistakes
- Comparison (if applicable)
- CTA to find consultants on Verixa
- FAQ (3–5 questions)
- Simple glossary

Requirements:
- Clear, simple English
- Not robotic
- Trust-focused tone
- Optimized for AI search (AEO/GEO)
- Include practical advice, not generic text`;

  return (
    <div className="space-y-10">
      <div className="bg-white border border-[#f5ecd8] rounded-[28px] p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#C29967] font-bold">CMS</p>
            <h1 className="text-3xl font-serif font-black mt-2">Blog Control Center</h1>
            <p className="text-gray-600 mt-2">
              Manage blog structure, categories, and article intent. Every article must lead to a consultant.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/blog"
              className="bg-[#1A1A1A] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-black transition"
            >
              View Blog
            </Link>
            <Link
              href="/search"
              className="border border-[#f5ecd8] text-[#1A1A1A] px-6 py-3 rounded-xl text-sm font-bold hover:border-[#C29967] transition"
            >
              View Consultant Search
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-[#f5ecd8] rounded-[24px] p-6">
          <h2 className="text-lg font-bold">Core Rules</h2>
          <ul className="mt-4 space-y-2 text-sm text-gray-700 list-disc list-inside">
            <li>Only 4 categories. Do not add more.</li>
            <li>Every article must answer a clear intent.</li>
            <li>Each article includes inline CTA + end CTA.</li>
            <li>Structured sections for SEO / AEO / GEO.</li>
            <li>Traffic -&gt; Trust -&gt; Booking in every piece.</li>
          </ul>
        </div>
        <div className="bg-white border border-[#f5ecd8] rounded-[24px] p-6">
          <h2 className="text-lg font-bold">Publishing Workflow</h2>
          <ol className="mt-4 space-y-2 text-sm text-gray-700 list-decimal list-inside">
            <li>Draft content using the Verixa template.</li>
            <li>Add post in `verixa-web/src/lib/blog.ts`.</li>
            <li>Assign one of the 4 categories.</li>
            <li>Include internal links to search and profiles.</li>
            <li>Publish and verify the `/blog/[slug]` page.</li>
          </ol>
        </div>
        <div className="bg-[#1A1A1A] text-white rounded-[24px] p-6">
          <h2 className="text-lg font-bold">Fixed Categories</h2>
          <div className="mt-4 space-y-3">
            {blogCategories.map((cat) => (
              <div key={cat.slug} className="border border-white/10 rounded-xl p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-[#C29967] font-bold">
                  {cat.title}
                </p>
                <p className="text-sm text-gray-300 mt-2">{cat.description}</p>
                <p className="text-[10px] uppercase tracking-widest text-gray-500 mt-2">{cat.slug}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#f5ecd8] rounded-[28px] p-6">
        <h2 className="text-xl font-bold">Current Posts</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-widest text-gray-500">
              <tr className="border-b border-[#f5ecd8]">
                <th className="text-left py-3">Title</th>
                <th className="text-left py-3">Slug</th>
                <th className="text-left py-3">Category</th>
                <th className="text-left py-3">Published</th>
                <th className="text-left py-3">Keywords</th>
              </tr>
            </thead>
            <tbody>
              {blogPosts.map((post) => (
                <tr key={post.slug} className="border-b border-gray-100">
                  <td className="py-3">
                    <Link href={`/blog/${post.slug}`} className="font-semibold hover:text-[#C29967]">
                      {post.title}
                    </Link>
                  </td>
                  <td className="py-3 text-gray-500">{post.slug}</td>
                  <td className="py-3 text-gray-500">{post.category}</td>
                  <td className="py-3 text-gray-500">{post.publishedAt}</td>
                  <td className="py-3 text-gray-500">{post.keywords.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-[#f5ecd8] rounded-[28px] p-6">
        <h2 className="text-xl font-bold">Verixa Blog Prompt</h2>
        <p className="text-sm text-gray-600 mt-2">
          Use this exact template for every article. Do not remove sections.
        </p>
        <pre className="mt-4 text-xs bg-[#FDFCFB] border border-[#f5ecd8] rounded-[18px] p-4 whitespace-pre-wrap">
{template}
        </pre>
      </div>
    </div>
  );
}
