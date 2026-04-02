// ============================================================================
// Hardware Source: dashboard/admin/social/page.tsx
// Route: /dashboard/admin/social
// Version: 1.0.0 — 2026-03-23
// Why: The UI interface for Phase 30 Multi-Format Distribution
// Env / Identity: React Server Component
// Owner: Verixa Web
// ============================================================================

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SocialHubClient from "./SocialHubClient";
import { Share2 } from "lucide-react";
import Image from "next/image";

export default async function SocialDistributionPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") redirect("/login");

  const posts = await prisma.blogPost.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      socialJobs: true,
    },
  });

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-screen flex flex-col bg-gray-50/50">
      <div className="mb-6 shrink-0 flex justify-between items-end">
        <div className="flex items-center gap-4">
          <Image src="/brand/Vertixa2.png" alt="Verixa" width={44} height={44} className="rounded-xl object-contain" />
          <div>
            <h1 className="text-3xl font-serif font-black text-gray-900 tracking-tight flex items-center gap-3">
              Multi-Format Social Hub <Share2 className="w-6 h-6 text-[#2FA4A9]" />
            </h1>
            <p className="text-gray-600 mt-1 font-light text-sm max-w-2xl">
              Ignite the 4-layer GPT-4o Action sequence to generate optimized LinkedIn, Twitter, and Telegram posts directly from your CMS articles.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[700px] flex">
        <SocialHubClient initialPosts={posts} />
      </div>
    </div>
  );
}
