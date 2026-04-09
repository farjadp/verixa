// ============================================================================
// Hardware Source: src/app/dashboard/support/page.tsx
// Route: /dashboard/support
// Version: 1.0.0 — 2026-04-08
// Why: Authenticated consultant/dashboard route for profile management, booking operations, and workspace workflows.
// Domain: Authenticated Dashboard
// Env / Identity: React Server Component
// Owner: Verixa Web
// Notes: Assumes authenticated session context; unauthorized users must be redirected before data access.
// ============================================================================
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { getTicketsForUser } from "@/actions/support.actions";
import SupportTicketClient from "./SupportTicketClient";

export default async function SupportPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/login");

  const tickets = await getTicketsForUser((session.user as any).id);

  return (
    <div className="p-8 max-w-[1600px] mx-auto h-[calc(100vh-2rem)] flex flex-col">
      <div className="mb-6 shrink-0">
        <h1 className="text-3xl font-serif font-black text-[#0B2136] tracking-tight">Support & Tickets</h1>
        <p className="text-gray-500 mt-1 font-light text-sm">Create disputes, ask questions, or report bugs directly to our administrative team.</p>
      </div>

      <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex relative">
        <SupportTicketClient initialTickets={tickets} userId={(session.user as any).id} />
      </div>
    </div>
  );
}
