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
import { getBlogPosts } from "@/actions/blog.actions";
import BlogListClient from "./BlogListClient";
import { requireAdminPage } from "../_lib/guard";
import { AdminPageHeader, AdminShell } from "../_components/AdminUI";

export default async function AdminBlogPage() {
  await requireAdminPage();

  // Fetch all posts, including drafts
  const posts = await getBlogPosts(false);

  return (
    <AdminShell wide>
      <AdminPageHeader
        section="Content"
        title="Articles"
        description="Every blog post, published and draft, from any source (pipeline, wizard, aggregator or hand-written)."
      />
      <div className="relative flex h-[calc(100vh-14rem)] min-h-[500px] overflow-hidden rounded-2xl border border-gray-200 bg-navy shadow-sm">
        <BlogListClient initialPosts={posts} />
      </div>
    </AdminShell>
  );
}
