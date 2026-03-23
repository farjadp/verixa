// ============================================================================
// Hardware Source: dashboard/admin/ai-factory/page.tsx
// Route: /dashboard/admin/ai-factory
// Version: 1.0.0 — 2026-03-23
// Why: Entry point for the AI Blogging Engine (Phase 26)
// Env / Identity: React Server Component
// Owner: Verixa Web
// ============================================================================

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import AIFactoryWizard from "./AIFactoryWizard";
import { Sparkles } from "lucide-react";

export default async function AIFactoryPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") redirect("/login");

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-screen flex flex-col">
      <div className="mb-6 shrink-0 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif font-black text-white tracking-tight flex items-center gap-3">
            Autonomous SEO Factory <Sparkles className="w-6 h-6 text-[#2FA4A9]" />
          </h1>
          <p className="text-gray-400 mt-1 font-light text-sm max-w-2xl">
            Execute the 5-Layer AI Content Pipeline natively. Transform raw topics into hyper-structured, DALL-E/FAL illustrated, AEO-optimized web assets.
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-[700px] bg-[#0F2A44] border border-gray-800 rounded-xl overflow-hidden shadow-2xl relative flex">
        <AIFactoryWizard />
      </div>
    </div>
  );
}
