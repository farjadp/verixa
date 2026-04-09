// ============================================================================
// Hardware Source: src/app/dashboard/notifications/page.tsx
// Route: /dashboard/notifications
// Version: 1.0.0 — 2026-04-08
// Why: Authenticated consultant/dashboard route for profile management, booking operations, and workspace workflows.
// Domain: Authenticated Dashboard
// Env / Identity: React Server Component
// Owner: Verixa Web
// Notes: Assumes authenticated session context; unauthorized users must be redirected before data access.
// ============================================================================
import { getUserNotifications } from "@/actions/notification.actions";
import ClientNotificationList from "./ClientNotificationList";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login");
  }

  const { notifications } = await getUserNotifications();

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-[#1A1F2B] mb-2">Activity & Notifications</h1>
        <p className="text-gray-500">Stay up to date with your latest booking requests, messages, and platform updates.</p>
      </div>

      <ClientNotificationList initialNotifications={notifications} userRole={(session.user as any)?.role || "CLIENT"} />
    </div>
  );
}
