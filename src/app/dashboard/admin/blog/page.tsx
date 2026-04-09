// ============================================================================
// Hardware Source: src/app/dashboard/admin/blog/page.tsx
// Route: /dashboard/admin/blog
// Version: 1.0.0 — 2026-04-08
// Why: High-privilege admin route for platform governance, operations, and configuration workflows.
// Domain: Admin Operations
// Env / Identity: React Server Component
// Owner: Verixa Web
// Notes: Must remain server-auth gated for ADMIN users; avoid exposing privileged operations to client without checks.
// Critical Path: Privileged management surface affecting platform-wide data, policy, and operational behavior.
// Security Notes: Enforce ADMIN authorization server-side before reads/writes and before rendering sensitive payloads.
// Risk Notes: Regressions here can impact many users; prefer explicit guards and resilient fallbacks for DB calls.
// ============================================================================
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { getBlogPosts } from "@/actions/blog.actions";
import BlogListClient from "./BlogListClient";

export default async function AdminBlogPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") redirect("/login");

  // Fetch all posts, including drafts
  const posts = await getBlogPosts(false);

  return (
    <div className="p-8 max-w-[1600px] mx-auto h-[calc(100vh-2rem)] flex flex-col">
      <div className="mb-6 shrink-0 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif font-black text-white tracking-tight">SEO Blog Content Manager</h1>
          <p className="text-gray-400 mt-1 font-light text-sm">Create and publish Programmatic Acquisition content to drive traffic and booking conversions.</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-[#0F2A44] border border-gray-800 rounded-xl overflow-hidden shadow-2xl flex relative">
        <BlogListClient initialPosts={posts} />
      </div>
    </div>
  );
}
