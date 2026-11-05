"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  ChevronDown, LayoutDashboard, Presentation, BarChart2, CalendarDays, Inbox,
  MessageSquare, Activity, Bell, User, CreditCard, LifeBuoy, HelpCircle,
  UserCircle, Bookmark, Settings, KeyRound,
} from "lucide-react";
import { ADMIN_NAV, activeAdminHref } from "@/app/dashboard/admin/_lib/nav";

export type NavItem = {
  label: string;
  href?: string;
  icon?: any;
  children?: { label: string; href: string }[];
};

export type NavGroupType = {
  label: string;
  items: NavItem[];
};

export default function SidebarNav({ role }: { role: string }) {
  const pathname = usePathname();
  const [openStates, setOpenStates] = useState<Record<string, boolean>>({});

  const consultantGroups: NavGroupType[] = [
    {
      label: "Overview",
      items: [
        { label: "Dashboard Home", href: "/dashboard", icon: LayoutDashboard },
        { label: "Analytics", href: "/dashboard/analytics", icon: BarChart2 },
      ]
    },
    {
      label: "Operations",
      items: [
        { label: "Booking", href: "/dashboard/booking", icon: CalendarDays },
        { label: "Leads & Inbox", href: "/dashboard/leads", icon: Inbox },
        { label: "Reviews", href: "/dashboard/reviews", icon: MessageSquare },
        { label: "Activity Feed", href: "/dashboard/activity", icon: Activity },
        { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
      ]
    },
    {
      label: "Management",
      items: [
        { label: "Profile Management", href: "/dashboard/profile", icon: User },
        { label: "Meeting & Notice Settings", href: "/dashboard/settings", icon: Settings },
        { label: "Account & Password", href: "/dashboard/client/settings", icon: KeyRound },
        { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
      ]
    },
    {
      label: "Support",
      items: [
        { label: "Support (AI & Chat)", href: "/dashboard/support", icon: LifeBuoy },
        { label: "Platform Guide", href: "/dashboard/help", icon: HelpCircle },
      ]
    }
  ];

  const clientGroups: NavGroupType[] = [
    {
      label: "Main",
      items: [
        { label: "Control Center", href: "/dashboard", icon: LayoutDashboard },
        { label: "Activity Feed", href: "/dashboard/activity", icon: Activity },
        { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
      ]
    },
    {
      label: "Immigration Profile",
      items: [
        { label: "My Bookings", href: "/dashboard/client/bookings", icon: CalendarDays },
        { label: "Immigration Profile", href: "/dashboard/client/profile", icon: UserCircle },
        { label: "Saved Profiles", href: "/dashboard/client/saved", icon: Bookmark },
        { label: "My Reviews", href: "/dashboard/client/reviews", icon: MessageSquare },
      ]
    },
    {
      label: "Settings & Support",
      items: [
        { label: "Support & Tickets", href: "/dashboard/support", icon: LifeBuoy },
        { label: "Account Settings", href: "/dashboard/client/settings", icon: Settings },
      ]
    }
  ];

  // Admin IA lives in src/app/dashboard/admin/_lib/nav.ts (flat, no nested menus).
  const adminGroups: NavGroupType[] = ADMIN_NAV.map((g) => ({
    label: g.label,
    items: g.items.map(({ label, href, icon }) => ({ label, href, icon })),
  }));
  const adminActiveHref = role === "ADMIN" ? activeAdminHref(pathname) : null;

  let activeGroups = role === "CONSULTANT" ? consultantGroups : clientGroups;
  if (role === "ADMIN") activeGroups = adminGroups;

  // Auto-open groups that contain the active path
  useEffect(() => {
    const newOpenStates: Record<string, boolean> = { ...openStates };
    let changed = false;

    activeGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (item.children) {
          const isActive = item.children.some((child) => pathname === child.href || pathname.startsWith(child.href + "/"));
          if (isActive && !newOpenStates[item.label]) {
            newOpenStates[item.label] = true;
            changed = true;
          }
        }
      });
    });

    if (changed) {
      setOpenStates(newOpenStates);
    }
  }, [pathname, activeGroups]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleGroup = (label: string) => {
    setOpenStates((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <nav className="flex-1 overflow-y-auto px-4 py-6">
      {activeGroups.map((group, groupIdx) => (
        <div key={groupIdx} className="mb-6 last:mb-0">
          <div className="px-4 pb-2 text-xs font-black text-gray-400 uppercase tracking-widest">
            {group.label}
          </div>
          <div className="space-y-1">
            {group.items.map((item, itemIdx) => {
              const Icon = item.icon;
              
              // Handle Expandable Items
              if (item.children && item.children.length > 0) {
                const isOpen = !!openStates[item.label];
                const hasActiveChild = item.children.some(c => pathname === c.href || pathname.startsWith(c.href + "/"));
                
                return (
                  <div key={item.label} className="mb-1">
                    <button
                      onClick={() => toggleGroup(item.label)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                        hasActiveChild || isOpen 
                          ? "text-[#1A1F2B] bg-[#F5F7FA]" 
                          : "text-gray-600 hover:text-[#1A1F2B] hover:bg-[#F5F7FA]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {Icon && <Icon className="w-5 h-5 opacity-70" />}
                        {item.label}
                      </div>
                      <ChevronDown 
                        className={`w-4 h-4 opacity-50 transition-transform ${isOpen ? "rotate-180" : ""}`} 
                      />
                    </button>
                    
                    {/* Collapsible Children */}
                    {isOpen && (
                      <div className="mt-1 ml-4 pl-4 border-l-2 border-gray-100 space-y-1">
                        {item.children.map((child) => {
                          const isChildActive = pathname === child.href || pathname.startsWith(child.href + "/");
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
                                isChildActive
                                  ? "text-[#0F2A44] bg-[#F5F7FA] font-bold"
                                  : "text-gray-500 hover:text-[#1A1F2B] hover:bg-gray-50"
                              }`}
                            >
                              {child.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // Handle Direct Links
              const isActive = role === "ADMIN"
                ? adminActiveHref === item.href
                : pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
              return (
                <Link
                  key={item.href || item.label}
                  href={item.href!}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors mb-1 ${
                    isActive 
                      ? "text-[#1A1F2B] bg-[#F5F7FA]" 
                      : "text-gray-600 hover:text-[#1A1F2B] hover:bg-[#F5F7FA]"
                  }`}
                >
                  {Icon && <Icon className="w-5 h-5 opacity-70" />}
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
