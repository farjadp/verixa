// ============================================================================
// Hardware Source: page.tsx
// Version: 1.0.1 — 2026-03-22
// Why: Dashboard Role Resolver. Serves Consultant Home or Client Home based on RBAC.
// Env / Identity: React Server Component
// ============================================================================

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import ConsultantHome from "./ConsultantHome";
import ClientHome from "./ClientHome";
import AdminHome from "./admin/AdminHome";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login");
  }

  const role = (session.user as any).role;
  const isConsultant = role === "CONSULTANT";
  const isAdmin = role === "ADMIN";

  if (isAdmin) {
    return <AdminHome />;
  }

  return (
    <main className="p-8 max-w-6xl mx-auto">
      {isConsultant ? <ConsultantHome /> : <ClientHome />}
    </main>
  );
}
