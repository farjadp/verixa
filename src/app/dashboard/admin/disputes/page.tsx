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
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { getAllTicketsForAdmin } from "@/actions/support.actions";
import AdminSupportClient from "./AdminSupportClient";

export default async function AdminDisputesPage({
  searchParams
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") redirect("/login");

  const sp = await searchParams;
  const filter = sp.filter || "ALL";

  // Fetch all tickets for admins
  const tickets = await getAllTicketsForAdmin(filter);

  return (
    <div className="p-8 max-w-[1600px] mx-auto h-[calc(100vh-2rem)] flex flex-col">
      <div className="mb-6 shrink-0 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif font-black text-white tracking-tight">Support & Disputes</h1>
          <p className="text-gray-400 mt-1 font-light text-sm">Global inbox for all client and consultant tickets.</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-[#0F2A44] border border-gray-800 rounded-xl overflow-hidden shadow-2xl flex relative">
        <AdminSupportClient initialTickets={tickets} adminId={(session.user as any).id} />
      </div>
    </div>
  );
}
