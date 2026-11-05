// ============================================================================
// Hardware Source: src/app/dashboard/admin/logs/page.tsx
// Route: /dashboard/admin/logs
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
import AdminLogsTable from "./AdminLogsTable";
import { requireAdminPage } from "../_lib/guard";
import { AdminPageHeader, AdminShell } from "../_components/AdminUI";

export default async function AdminLogsPage() {
  await requireAdminPage();

  const logs = await prisma.systemLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200, 
    include: { user: { select: { email: true, name: true } } }
  });

  return (
    <AdminShell>
      <AdminPageHeader
        section="Overview"
        title="Activity log"
        description="The latest 200 system events: logins, content approvals, ticket changes and admin actions."
      />
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <AdminLogsTable initialLogs={logs} />
      </div>
    </AdminShell>
  );
}
