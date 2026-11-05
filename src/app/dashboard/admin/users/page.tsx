// ============================================================================
// Hardware Source: src/app/dashboard/admin/users/page.tsx
// Route: /dashboard/admin/users
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
import { getAllUsers } from "@/actions/users.actions";
import UsersClient from "./UsersClient";
import { requireAdminPage } from "../_lib/guard";
import { AdminPageHeader, AdminShell } from "../_components/AdminUI";

export default async function AdminUsersPage() {
  await requireAdminPage();
  let users: any[] = [];
  let error = null;

  try {
    users = await getAllUsers();
  } catch (e: any) {
    error = e.message;
  }

  return (
    <AdminShell wide>
      <AdminPageHeader
        section="People"
        title="Users"
        description="Every account (clients, consultants, admins): change roles, ban, or create accounts."
      />
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-bold text-error">Could not load users: {error}</div>
      ) : (
        <UsersClient initialUsers={users} />
      )}
    </AdminShell>
  );
}
