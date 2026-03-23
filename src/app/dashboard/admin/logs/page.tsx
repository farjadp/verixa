// ============================================================================
// Hardware Source: dashboard/admin/logs/page.tsx
// Route: /dashboard/admin/logs
// Version: 1.0.0 — 2026-03-23
// Why: Route entry for /dashboard/admin/logs (structured for SEO, trust, and conversion)
// Env / Identity: React Server Component
// Owner: Verixa Web
// Notes: Keep structure consistent; every section must support Traffic -> Trust -> Booking
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
         <h1 className="text-3xl font-serif font-bold text-[#1A1A1A]">System Audit Logs</h1>
         <p className="text-gray-500 mt-2">Comprehensive, real-time activity tracking across the Consultation Control Center.</p>
      </div>

      <div className="bg-white rounded-[32px] border border-[#f5ecd8] shadow-sm overflow-hidden">
        <AdminLogsTable initialLogs={logs} />
      </div>
    </div>
  );
}
