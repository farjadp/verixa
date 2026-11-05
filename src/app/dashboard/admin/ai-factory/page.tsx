// ============================================================================
// Hardware Source: src/app/dashboard/admin/ai-factory/page.tsx
// Route: /dashboard/admin/ai-factory
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
import AIFactoryWizard from "./AIFactoryWizard";
import { requireAdminPage } from "../_lib/guard";
import { AdminPageHeader, AdminShell } from "../_components/AdminUI";

export default async function AIFactoryPage() {
  await requireAdminPage();

  return (
    <AdminShell wide>
      <AdminPageHeader
        section="Content"
        title="AI article wizard"
        description="Write a single article step by step: brief, draft, images, social copy, then save to Articles as a draft. For the daily automated flow use the Content pipeline."
      />
      <div className="relative flex min-h-[700px] overflow-hidden rounded-2xl border border-gray-200 bg-navy shadow-sm">
        <AIFactoryWizard />
      </div>
    </AdminShell>
  );
}
