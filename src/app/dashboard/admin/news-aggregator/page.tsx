// ============================================================================
// Hardware Source: dashboard/admin/news-aggregator/page.tsx
// Route: /dashboard/admin/news-aggregator
// Version: 1.0.0 — 2026-03-23
// Why: The UI interface for Phase 28 Autonomous AI Aggregator
// Env / Identity: React Server Component
// Owner: Verixa Web
// ============================================================================

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import NewsAggregatorClient from "./NewsAggregatorClient";
import { Satellite } from "lucide-react";

export default async function NewsAggregatorPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") redirect("/login");

  const sources = await prisma.contentSource.findMany({
    orderBy: { createdAt: "desc" }
  });

  const rawQueue = await prisma.rawArticle.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { source: true }
  });

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-screen flex flex-col">
      <div className="mb-6 shrink-0 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif font-black text-white tracking-tight flex items-center gap-3">
            Autonomous Content Aggregator <Satellite className="w-6 h-6 text-[#C29967]" />
          </h1>
          <p className="text-gray-400 mt-1 font-light text-sm max-w-2xl">
            Monitor the 6-layer GPT-4o pipeline. Register external syndicates (RSS), audit the extraction queue, and command automated AEO mass-generation loops.
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-[700px] flex">
        <NewsAggregatorClient initialSources={sources} initialQueue={rawQueue} />
      </div>
    </div>
  );
}
