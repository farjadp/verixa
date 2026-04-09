// ============================================================================
// Hardware Source: src/app/dashboard/admin/sync/page.tsx
// Route: /dashboard/admin/sync
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
import { getRegistrySyncPreview, getLastSyncLog } from "@/actions/sync.actions";
import RegistrySyncClient from "./RegistrySyncClient";

export const maxDuration = 60; // Max execution time for Vercel
export const metadata = { title: "Registry Sync | Verixa Admin" };

export default async function SyncPage() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") redirect("/dashboard");

  const [preview, lastSync] = await Promise.all([
    getRegistrySyncPreview().catch(() => null),
    getLastSyncLog().catch(() => null),
  ]);

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-black text-[#0F2A44]">Registry Sync</h1>
          <p className="text-sm text-gray-500 mt-1">
            Import and update consultant profiles from the CICC scraper database into Verixa.
          </p>
        </div>
        <RegistrySyncClient preview={preview} lastSync={lastSync} />
      </div>
    </div>
  );
}
