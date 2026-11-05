// ============================================================================
// Hardware Source: src/app/dashboard/admin/disputes/page.tsx
// Route: /dashboard/admin/disputes
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
import { getAllTicketsForAdmin } from "@/actions/support.actions";
import AdminSupportClient from "./AdminSupportClient";
import { requireAdminPage } from "../_lib/guard";
import { AdminPageHeader, AdminShell } from "../_components/AdminUI";

export default async function AdminDisputesPage({
  searchParams
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { userId: adminUserId } = await requireAdminPage();

  const sp = await searchParams;
  const filter = sp.filter || "ALL";

  // Fetch all tickets for admins
  const tickets = await getAllTicketsForAdmin(filter);

  return (
    <AdminShell wide>
      <AdminPageHeader
        section="People"
        title="Support tickets"
        description="One inbox for client and consultant tickets, including booking disputes. Internal notes are never shown to the user."
      />
      <div className="relative flex h-[calc(100vh-14rem)] min-h-[500px] overflow-hidden rounded-2xl border border-gray-200 bg-navy shadow-sm">
        <AdminSupportClient initialTickets={tickets} adminId={adminUserId} />
      </div>
    </AdminShell>
  );
}
