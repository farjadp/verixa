// ============================================================================
// Hardware Source: dashboard/notifications/page.tsx
// Route: /dashboard/notifications
// Version: 1.0.0 — 2026-03-23
// Why: Route entry for /dashboard/notifications (structured for SEO, trust, and conversion)
// Env / Identity: React Server Component
// Owner: Verixa Web
// Notes: Keep structure consistent; every section must support Traffic -> Trust -> Booking
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

  const notifications = await getUserNotifications();

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-[#1A1A1A] mb-2">Activity & Notifications</h1>
        <p className="text-gray-500">Stay up to date with your latest booking requests, messages, and platform updates.</p>
      </div>

      <ClientNotificationList initialNotifications={notifications} userRole={(session.user as any)?.role || "CLIENT"} />
    </div>
  );
}
