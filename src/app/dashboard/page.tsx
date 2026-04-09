// ============================================================================
// Hardware Source: src/app/dashboard/page.tsx
// Route: /dashboard
// Version: 1.0.0 — 2026-04-08
// Why: Dashboard resolver route that applies authentication and role-based routing to correct home surfaces.
// Domain: Authenticated Dashboard
// Env / Identity: React Server Component
// Owner: Verixa Web
// Notes: Assumes authenticated session context; unauthorized users must be redirected before data access.
// Critical Path: Central post-auth entry; incorrect role routing blocks user workspace access.
// Primary Dependencies: Server session resolution, RBAC role checks, consultant/client home loaders.
// Risk Notes: Keep auth checks server-side; never trust role state from client inputs.
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
