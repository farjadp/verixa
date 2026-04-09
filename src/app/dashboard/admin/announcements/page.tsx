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
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import AnnouncementComposer from "./AnnouncementComposer";

export const metadata = {
  title: "Admin Announcements | Verixa",
};

export default async function AdminAnnouncementsPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any)?.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center bg-[#0F2A44] p-6 rounded-3xl text-white shadow-xl">
        <div>
          <h1 className="text-3xl font-black font-serif text-[#2FA4A9]">Announcement Broadcast</h1>
          <p className="text-gray-300 text-sm mt-1">Send priority in-app announcements directly to consultant dashboards.</p>
        </div>
      </div>

      <AnnouncementComposer />
    </div>
  );
}
