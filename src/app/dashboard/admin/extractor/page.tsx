// ============================================================================
// Hardware Source: src/app/dashboard/admin/extractor/page.tsx
// Route: /dashboard/admin/extractor
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
import { Metadata } from 'next';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import ExtractorClient from "./ExtractorClient";

export const metadata: Metadata = {
  title: 'Lead Extraction | Verixa Admin',
  description: 'Extract and analyze unified registry data streams.',
};

export default async function AdminExtractorPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    redirect("/login");
  }

  return <ExtractorClient />;
}
