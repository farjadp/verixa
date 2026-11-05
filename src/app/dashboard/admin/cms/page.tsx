// ============================================================================
// Hardware Source: src/app/dashboard/admin/cms/page.tsx
// Route: /dashboard/admin/cms
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
import { prisma } from "@/lib/prisma";
import CmsHubClient from "./CmsHubClient";
import { requireAdminPage } from "../_lib/guard";
import { AdminPageHeader, AdminShell } from "../_components/AdminUI";

export default async function AdminCmsHubPage() {
  await requireAdminPage();

  // Fetch all posts for dashboard metrics and tracking
  const posts = await prisma.blogPost.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      title: true,
      slug: true,
      category: true,
      isPublished: true,
      seoTitle: true,
      seoDesc: true,
      socialHooks: true,
      createdAt: true,
      updatedAt: true
    }
  });

  return (
    <AdminShell wide>
      <AdminPageHeader
        section="Content"
        title="Content hub"
        description="SEO and social completeness across all articles, with shortcuts to every content tool."
      />
      <div className="flex min-h-[700px]">
        <CmsHubClient initialPosts={posts} />
      </div>
    </AdminShell>
  );
}
