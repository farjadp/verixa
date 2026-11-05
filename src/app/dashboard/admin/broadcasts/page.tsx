// ============================================================================
// Hardware Source: src/app/dashboard/admin/broadcasts/page.tsx
// Route: /dashboard/admin/broadcasts
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
import { getCampaignHistory, getDailyEmailUsage } from "@/actions/broadcast.actions";
import BroadcastComposer from "./BroadcastComposer";
import BroadcastHistory from "./BroadcastHistory";
import { requireAdminPage } from "../_lib/guard";
import { AdminPageHeader, AdminShell } from "../_components/AdminUI";

export default async function AdminBroadcastsPage() {
  await requireAdminPage();
  let campaigns: any[] = [];
  let dailyUsed = 0;
  try {
    [campaigns, dailyUsed] = await Promise.all([getCampaignHistory(), getDailyEmailUsage()]);
  } catch (e) {}

  return (
    <AdminShell wide>
      <AdminPageHeader
        section="People"
        title="Email broadcasts"
        description="Email campaigns to registry consultants or platform users. Sends go out through Resend and count toward the daily limit."
      />
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <BroadcastComposer dailyUsed={dailyUsed} dailyLimit={process.env.RESEND_DAILY_LIMIT ? parseInt(process.env.RESEND_DAILY_LIMIT, 10) : 50000} />
        </div>
        <div className="sticky top-8">
          <BroadcastHistory campaigns={campaigns} />
        </div>
      </div>
    </AdminShell>
  );
}
