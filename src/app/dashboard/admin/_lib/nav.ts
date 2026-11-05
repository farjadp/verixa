import {
  LayoutDashboard, BarChart2, Activity, User, LifeBuoy, Megaphone, Mailbox,
  Users, BadgeCheck, MessageSquare, CalendarDays, Tags, Workflow, FileText,
  Share2, Rss, Layers, Sparkles, Zap, CreditCard, Tag, Settings, RefreshCw,
  Database, Building, type LucideIcon,
} from "lucide-react";

// Single source of truth for the admin information architecture. The sidebar
// and the overview's "All tools" index both read from here.

export type AdminNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** One line shown on the overview tool index. */
  hint: string;
};

export type AdminNavGroup = { label: string; items: AdminNavItem[] };

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Overview", href: "/dashboard", icon: LayoutDashboard, hint: "Counts and everything that needs action" },
      { label: "Analytics", href: "/dashboard/admin/analytics", icon: BarChart2, hint: "Bookings, revenue, demand, top consultants" },
      { label: "Activity log", href: "/dashboard/admin/logs", icon: Activity, hint: "Audit trail of system events" },
    ],
  },
  {
    label: "People",
    items: [
      { label: "Users", href: "/dashboard/admin/users", icon: User, hint: "Accounts, roles, bans" },
      { label: "Support tickets", href: "/dashboard/admin/disputes", icon: LifeBuoy, hint: "Client and consultant tickets, disputes" },
      { label: "Announcements", href: "/dashboard/admin/announcements", icon: Megaphone, hint: "In-app banner to consultant dashboards" },
      { label: "Email broadcasts", href: "/dashboard/admin/broadcasts", icon: Mailbox, hint: "Email campaigns to the registry" },
    ],
  },
  {
    label: "Consultants",
    items: [
      { label: "Directory", href: "/dashboard/admin/consultants", icon: Users, hint: "CICC registry joined with platform data" },
      { label: "Claims", href: "/dashboard/admin/claims", icon: BadgeCheck, hint: "Claims needing manual review, recent claims" },
      { label: "Reviews", href: "/dashboard/admin/reviews", icon: MessageSquare, hint: "Hide or restore client reviews" },
      { label: "Bookings", href: "/dashboard/admin/bookings", icon: CalendarDays, hint: "All consultations and payments" },
      { label: "Specializations", href: "/dashboard/admin/specializations", icon: Tags, hint: "Taxonomy and per-plan limits" },
    ],
  },
  {
    label: "Content",
    items: [
      { label: "Content pipeline", href: "/dashboard/admin/content-pipeline", icon: Workflow, hint: "Daily automated drafts — approve or reject" },
      { label: "Articles", href: "/dashboard/admin/blog", icon: FileText, hint: "Every blog post; write or edit by hand" },
      { label: "Social publishing", href: "/dashboard/admin/social", icon: Share2, hint: "Generate, approve and post social copy" },
      { label: "Sources & feeds", href: "/dashboard/admin/news-aggregator", icon: Rss, hint: "RSS sources and the legacy raw-article queue" },
      { label: "Content hub", href: "/dashboard/admin/cms", icon: Layers, hint: "SEO completeness across all articles" },
      { label: "AI article wizard", href: "/dashboard/admin/ai-factory", icon: Sparkles, hint: "Write one article step by step with AI" },
    ],
  },
  {
    label: "Revenue",
    items: [
      { label: "Plans", href: "/dashboard/admin/plans", icon: Zap, hint: "Plans, pricing, feature matrix" },
      { label: "Subscriptions", href: "/dashboard/admin/plans/users", icon: CreditCard, hint: "Who is on which plan" },
      { label: "Coupons", href: "/dashboard/admin/coupons", icon: Tag, hint: "Discount codes and usage" },
    ],
  },
  {
    label: "Data & settings",
    items: [
      { label: "Platform settings", href: "/dashboard/admin/settings", icon: Settings, hint: "AI models, logos, integrations, backups" },
      { label: "Registry sync", href: "/dashboard/admin/sync", icon: RefreshCw, hint: "Import CICC scraper data into profiles" },
      { label: "Contact extractor", href: "/dashboard/admin/extractor", icon: Database, hint: "Export registry contacts, direct email/SMS" },
      { label: "Company enrichment", href: "/dashboard/admin/enrichment", icon: Building, hint: "Match consultants to companies" },
    ],
  },
];

/** Longest-prefix match, so /plans/users highlights Subscriptions, not Plans. */
export function activeAdminHref(pathname: string): string | null {
  let best: string | null = null;
  for (const group of ADMIN_NAV) {
    for (const item of group.items) {
      const match =
        pathname === item.href ||
        (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
      if (match && (!best || item.href.length > best.length)) best = item.href;
    }
  }
  return best;
}
