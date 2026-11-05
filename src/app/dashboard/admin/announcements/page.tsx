// ============================================================================
// Hardware Source: src/app/dashboard/admin/announcements/page.tsx
// Route: /dashboard/admin/announcements
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
import AnnouncementComposer from "./AnnouncementComposer";
import { requireAdminPage } from "../_lib/guard";
import { AdminPageHeader, AdminShell } from "../_components/AdminUI";

export const metadata = {
  title: "Admin Announcements | Verixa",
};

export default async function AdminAnnouncementsPage() {
  await requireAdminPage();

  return (
    <AdminShell>
      <AdminPageHeader
        section="People"
        title="Announcements"
        description="Post an in-app announcement to consultant dashboards. Sending also emails the selected audience."
      />
      <AnnouncementComposer />
    </AdminShell>
  );
}
