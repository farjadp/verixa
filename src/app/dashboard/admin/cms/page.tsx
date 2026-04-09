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
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CmsHubClient from "./CmsHubClient";
import { Layers } from "lucide-react";

export default async function AdminCmsHubPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") redirect("/login");

  // Fetch all posts for dashboard metrics and tracking
  const posts = await prisma.blogPost.findMany({
    orderBy: { createdAt: "desc" },
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
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-screen flex flex-col">
      <div className="mb-6 shrink-0 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif font-black text-gray-900 tracking-tight flex items-center gap-3">
            Unified Content Hub <Layers className="w-6 h-6 text-[#2FA4A9]" />
          </h1>
          <p className="text-gray-600 mt-1 font-light text-sm max-w-2xl">
            Command Center for all SEO Articles, Social Configurations, Categories, and AI Generation workflows.
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-[700px] flex">
        <CmsHubClient initialPosts={posts} />
      </div>
    </div>
  );
}
