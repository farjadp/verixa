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
import { Mailbox } from "lucide-react";

export default async function AdminBroadcastsPage() {
  let campaigns: any[] = [];
  let dailyUsed = 0;
  try {
    [campaigns, dailyUsed] = await Promise.all([getCampaignHistory(), getDailyEmailUsage()]);
  } catch (e) {}

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-black text-white tracking-tight flex items-center gap-3">
           <Mailbox className="w-8 h-8 text-[#2FA4A9]" /> Transmission Broadcasts
        </h1>
        <p className="text-gray-400 mt-2 font-light text-sm">
           Command center for deploying hyper-targeted email campaigns to the CICC registry.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          <BroadcastComposer dailyUsed={dailyUsed} dailyLimit={100} />
        </div>
        <div className="sticky top-8">
          <BroadcastHistory campaigns={campaigns} />
        </div>
      </div>
    </div>
  );
}
