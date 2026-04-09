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
import { ShieldAlert } from "lucide-react";

export default async function AdminUsersPage() {
  let users: any[] = [];
  let error = null;

  try {
    users = await getAllUsers();
  } catch (e: any) {
    error = e.message;
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      
      {/* Page Context */}
      <div>
        <h1 className="text-3xl font-serif font-black text-white tracking-tight flex items-center gap-3">
           <ShieldAlert className="w-8 h-8 text-[#2FA4A9]" /> Client Health & Identities
        </h1>
        <p className="text-gray-400 mt-2 font-light text-sm">
           Provision overrides, ban accounts, map roles (Clients/RCICs/Admins), and audit their activity traces.
        </p>
      </div>

      {error ? (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 font-bold p-6 rounded-2xl flex flex-col items-center">
          <ShieldAlert className="w-10 h-10 mb-4" />
          Access Denied: {error}
        </div>
      ) : (
        <UsersClient initialUsers={users} />
      )}

    </div>
  );
}
