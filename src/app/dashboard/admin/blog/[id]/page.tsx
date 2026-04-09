// ============================================================================
// Hardware Source: src/app/dashboard/admin/blog/[id]/page.tsx
// Route: /dashboard/admin/blog/[id]
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
import BlogEditorClient from "./BlogEditorClient";

export default async function AdminBlogEditorPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") redirect("/login");

  const resolvedParams = await params;
  const isNew = resolvedParams.id === "new";

  let post = null;
  if (!isNew) {
    post = await prisma.blogPost.findUnique({ where: { id: resolvedParams.id } });
    if (!post) redirect("/dashboard/admin/blog");
  }

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-screen flex flex-col">
      <BlogEditorClient initialPost={post} isNew={isNew} />
    </div>
  );
}
