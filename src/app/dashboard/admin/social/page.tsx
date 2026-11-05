// ============================================================================
// Hardware Source: src/app/dashboard/admin/social/page.tsx
// Route: /dashboard/admin/social
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
import SocialHubClient from "./SocialHubClient";
import { requireAdminPage } from "../_lib/guard";
import { AdminPageHeader, AdminShell } from "../_components/AdminUI";

export default async function SocialDistributionPage() {
  await requireAdminPage();

  const posts = await prisma.blogPost.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      socialJobs: true,
    },
  });

  return (
    <AdminShell wide>
      <AdminPageHeader
        section="Content"
        title="Social publishing"
        description="Generate LinkedIn, X, Telegram and Facebook copy from an article, approve it, then post. Nothing is posted without an explicit approve and post."
      />
      <div className="flex min-h-[700px]">
        <SocialHubClient initialPosts={posts} />
      </div>
    </AdminShell>
  );
}
