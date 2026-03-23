// ============================================================================
// Hardware Source: layout.tsx
// Version: 1.0.0 — 2026-03-22
// Why: Standard SaaS layout for the Consultant Growth Portal. Persistent Sidebar and Header.
// Env / Identity: React Server Component
// ============================================================================

import Link from "next/link";
import { 
  LayoutDashboard, User, MessageSquare, CalendarDays, Inbox, Presentation, 
  CreditCard, ShieldCheck, Share2, LogOut, LifeBuoy, HelpCircle, Settings, 
  Bookmark, UserCircle, Activity, ShieldAlert, CheckCircle, DollarSign, Bell, Flag, Award, RefreshCw, FileText, Search, Users
} from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login");
  }

  const isConsultant = (session.user as any).role === "CONSULTANT";

  const unreadNotifications = await prisma.notification.count({
    where: {
      userId: (session.user as any).id,
      isRead: false
    }
  });

  const consultantNavItems = [
    { label: "Dashboard Home", href: "/dashboard", icon: LayoutDashboard },
    { label: "Profile Management", href: "/dashboard/profile", icon: User },
    { label: "Reviews", href: "/dashboard/reviews", icon: MessageSquare },
    { label: "Booking", href: "/dashboard/booking", icon: CalendarDays },
    { label: "Leads & Inbox", href: "/dashboard/leads", icon: Inbox },
    { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
    { label: "Performance", href: "/dashboard/performance", icon: Presentation },
    { label: "Activity Feed", href: "/dashboard/activity", icon: Activity },
    { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
    { label: "Support (AI & Chat)", href: "/dashboard/support", icon: LifeBuoy },
    { label: "Platform Guide", href: "/dashboard/help", icon: HelpCircle },
  ];

  const clientNavItems = [
    { label: "Control Center", href: "/dashboard", icon: LayoutDashboard },
    { label: "My Bookings", href: "/dashboard/client/bookings", icon: CalendarDays, badge: "2" },
    { label: "Immigration Profile", href: "/dashboard/client/profile", icon: UserCircle },
    { label: "Saved Profiles", href: "/dashboard/client/saved", icon: Bookmark },
    { label: "My Reviews", href: "/dashboard/client/reviews", icon: MessageSquare },
    { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
    { label: "Activity Feed", href: "/dashboard/activity", icon: Activity },
    { label: "Support & Tickets", href: "/dashboard/support", icon: LifeBuoy },
    { label: "Account Settings", href: "/dashboard/client/settings", icon: Settings },
  ];

  const adminNavItems = [
    { label: "Mission Control", href: "/dashboard", icon: LayoutDashboard },
    { label: "Consultants", href: "/dashboard/admin/consultants", icon: Users },
    { label: "Claim Requests", href: "/dashboard/admin/claims", icon: CheckCircle },
    { label: "Bookings", href: "/dashboard/admin/bookings", icon: CalendarDays },
    { label: "Reviews", href: "/dashboard/admin/reviews", icon: MessageSquare },
    { label: "Users / Clients", href: "/dashboard/admin/users", icon: User },
    { label: "Revenue", href: "/dashboard/admin/revenue", icon: DollarSign },
    { label: "Notifications", href: "/dashboard/admin/notifications", icon: Bell },
    { label: "Audit Logs", href: "/dashboard/admin/logs", icon: ShieldAlert },
    { label: "Flags & Disputes", href: "/dashboard/admin/disputes", icon: Flag },
    { label: "Badge Management", href: "/dashboard/admin/badges", icon: Award },
    { label: "Registry Sync", href: "/dashboard/admin/sync", icon: RefreshCw },
    { label: "CMS Content", href: "/dashboard/admin/cms", icon: FileText },
    { label: "Platform Settings", href: "/dashboard/admin/settings", icon: Settings },
  ];

  let navItems = isConsultant ? consultantNavItems : clientNavItems;
  if ((session.user as any).role === "ADMIN") {
    navItems = adminNavItems;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex font-sans text-[#1A1A1A]">
      
      {/* SIDEBAR */}
      <aside className="w-72 bg-white border-r border-[#f5ecd8] hidden md:flex flex-col sticky top-0 h-screen">
        
        {/* Logo Area */}
        <div className="h-20 flex items-center px-8 border-b border-[#f5ecd8]">
          <Link href="/" className="text-2xl font-black font-serif tracking-tight text-[#1A1A1A]">
            Verixa<span className="text-[#C29967]">.</span>
            <span className="ml-2 text-[10px] bg-[#F6F3F0] text-[#C29967] px-2 py-1 rounded border border-[#f5ecd8] uppercase tracking-widest font-bold align-middle">Portal</span>
          </Link>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto px-4 py-8 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-500 hover:text-[#1A1A1A] hover:bg-[#FDFCFB] transition-colors"
                // Using exactly matching styles for now; typically we check pathname for 'active' state
              >
                <Icon className="w-5 h-5 opacity-70" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-[#f5ecd8] space-y-1">
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
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-[#f5ecd8] flex items-center justify-between px-8 sticky top-0 z-30">
          <div className="font-bold text-lg text-[#1A1A1A]">
             Dashboard
          </div>
          <div className="flex items-center gap-4">
             <Link href="/dashboard/notifications" className="relative p-2 text-gray-500 hover:text-[#1A1A1A] transition-colors rounded-full hover:bg-gray-100">
               <Bell className="w-5 h-5" />
               {unreadNotifications > 0 && (
                 <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
               )}
             </Link>
             {isConsultant && (
               <button className="flex items-center gap-2 border border-[#f5ecd8] bg-[#FDFCFB] px-4 py-2 rounded-xl text-xs font-bold hover:border-[#C29967] transition-colors text-gray-600">
                  <Share2 className="w-3.5 h-3.5" /> Share Profile
               </button>
             )}
             <div className="w-10 h-10 rounded-full bg-[#1A1A1A] text-[#C29967] flex items-center justify-center font-bold border-2 border-white shadow-sm cursor-pointer uppercase">
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
