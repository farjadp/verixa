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
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminLogsTable from "./AdminLogsTable";

export default async function AdminLogsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || (session.user as any).role !== "ADMIN") {
    redirect("/dashboard");
  }

  const logs = await prisma.systemLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200, 
    include: { user: { select: { email: true, name: true } } }
  });

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
         <h1 className="text-3xl font-serif font-bold text-[#1A1F2B]">System Audit Logs</h1>
         <p className="text-gray-500 mt-2">Comprehensive, real-time activity tracking across the Consultation Control Center.</p>
      </div>

      <div className="bg-white rounded-[32px] border border-[#e5e7eb] shadow-sm overflow-hidden">
        <AdminLogsTable initialLogs={logs} />
      </div>
    </div>
  );
}
