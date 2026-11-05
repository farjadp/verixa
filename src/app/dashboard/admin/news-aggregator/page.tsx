// ============================================================================
// Hardware Source: src/app/dashboard/admin/news-aggregator/page.tsx
// Route: /dashboard/admin/news-aggregator
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
import NewsAggregatorClient from "./NewsAggregatorClient";
import { requireAdminPage } from "../_lib/guard";
import { AdminPageHeader, AdminShell } from "../_components/AdminUI";

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 MINUTES (Max for Pro, Vercel Edge supports more but this guards against timeout loops)

export default async function NewsAggregatorPage() {
  await requireAdminPage();

  const sources = await prisma.contentSource.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const rawQueue = await prisma.rawArticle.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { source: true }
  });

  return (
    <AdminShell wide>
      <AdminPageHeader
        section="Content"
        title="Sources & feeds"
        description="The RSS/web sources the Content pipeline reads, plus the older raw-article queue and auto-pilot. New articles should come from the pipeline."
      />
      <div className="flex min-h-[700px]">
        <NewsAggregatorClient initialSources={sources} initialQueue={rawQueue} />
      </div>
    </AdminShell>
  );
}
