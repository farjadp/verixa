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
