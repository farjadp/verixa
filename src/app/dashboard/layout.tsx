// ============================================================================
// Hardware Source: layout.tsx
// Version: 1.0.0 — 2026-03-22
// Why: Standard SaaS layout for the Consultant Growth Portal. Persistent Sidebar and Header.
// Env / Identity: React Server Component
// ============================================================================

import Link from "next/link";
import { LogOut, ShieldCheck, Bell, Share2 } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SidebarNav from "@/components/ui/SidebarNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login");
  }

  const role = (session.user as any).role || "CLIENT";
  const isConsultant = role === "CONSULTANT";

  const unreadNotifications = await prisma.notification.count({
    where: {
      userId: (session.user as any).id,
      isRead: false
    }
  });

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex font-sans text-[#1A1F2B]">
      
      {/* SIDEBAR */}
      <aside className="w-72 bg-white border-r border-[#e5e7eb] hidden md:flex flex-col sticky top-0 h-screen">
        
        {/* Logo Area */}
        <div className="h-20 flex items-center px-8 border-b border-[#e5e7eb] shrink-0">
          <Link href="/" className="text-2xl font-black font-serif tracking-tight text-[#1A1F2B]">
            Verixa<span className="text-[#2FA4A9]">.</span>
            <span className="ml-2 text-[10px] bg-[#F5F7FA] text-[#2FA4A9] px-2 py-1 rounded border border-[#e5e7eb] uppercase tracking-widest font-bold align-middle">Portal</span>
          </Link>
        </div>

        {/* Nav Links */}
        <SidebarNav role={role} />

        {/* Bottom Actions */}
        <div className="p-4 border-t border-[#e5e7eb] space-y-1">
          {isConsultant && (
            <Link href="/dashboard/verification" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-green-700 bg-green-50 hover:bg-green-100 transition-colors">
              <ShieldCheck className="w-5 h-5 opacity-70" />
              Verified Status
            </Link>
          )}
          <Link href="/api/auth/signout" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors">
            <LogOut className="w-5 h-5 opacity-70" />
            Sign Out
          </Link>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 max-h-screen overflow-y-auto">
        
        {/* DASHBOARD HEADER */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-[#e5e7eb] flex items-center justify-between px-8 sticky top-0 z-30">
          <div className="font-bold text-lg text-[#1A1F2B]">
             Dashboard
          </div>
          <div className="flex items-center gap-4">
             <Link href="/dashboard/notifications" className="relative p-2 text-gray-500 hover:text-[#1A1F2B] transition-colors rounded-full hover:bg-gray-100">
               <Bell className="w-5 h-5" />
               {unreadNotifications > 0 && (
                 <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
               )}
             </Link>
             {isConsultant && (
               <button className="flex items-center gap-2 border border-[#e5e7eb] bg-[#ffffff] px-4 py-2 rounded-xl text-xs font-bold hover:border-[#2FA4A9] transition-colors text-gray-600">
                  <Share2 className="w-3.5 h-3.5" /> Share Profile
               </button>
             )}
             <div className="w-10 h-10 rounded-full bg-[#0F2A44] text-[#2FA4A9] flex items-center justify-center font-bold border-2 border-white shadow-sm cursor-pointer uppercase">
               {session.user?.name ? session.user.name[0] : (session.user?.email?.[0] || 'U')}
             </div>
          </div>
        </header>

        {/* DASHBOARD CHILDREN */}
        <div className="flex-1">
          {children}
        </div>
      </div>

    </div>
  );
}
