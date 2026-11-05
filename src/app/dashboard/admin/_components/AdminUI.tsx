import Link from "next/link";
import type { LucideIcon } from "lucide-react";

// Shared building blocks so every admin page has the same header, cards,
// tables, status pills and empty states. Server-safe (no hooks).

export function AdminPageHeader({
  title,
  description,
  section,
  actions,
  back,
}: {
  title: string;
  description?: string;
  /** Sidebar group the page lives in, shown above the title. */
  section?: string;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {back ? (
          <Link href={back.href} className="mb-2 inline-block text-xs font-bold text-softblue hover:text-navy">
            ← {back.label}
          </Link>
        ) : section ? (
          <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-teal">{section}</p>
        ) : null}
        <h1 className="text-2xl font-black tracking-tight text-navy md:text-3xl">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl text-sm text-gray-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function AdminShell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return <div className={`mx-auto w-full p-4 md:p-8 ${wide ? "max-w-[1600px]" : "max-w-7xl"}`}>{children}</div>;
}

export function AdminCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}>{children}</section>;
}

export function AdminButtonLink({
  href,
  children,
  variant = "secondary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const cls =
    variant === "primary"
      ? "bg-navy text-white hover:bg-[#0a1e30]"
      : "border border-gray-200 bg-white text-ink hover:border-teal";
  return (
    <Link href={href} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors ${cls}`}>
      {children}
    </Link>
  );
}

export type Tone = "neutral" | "success" | "warning" | "error" | "info" | "teal";

const TONES: Record<Tone, string> = {
  neutral: "bg-gray-100 text-gray-700",
  success: "bg-green-50 text-green-700",
  warning: "bg-amber-50 text-amber-700",
  error: "bg-red-50 text-red-700",
  info: "bg-blue-50 text-softblue",
  teal: "bg-teal/10 text-[#1d6f73]",
};

export function StatusPill({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function AdminEmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {Icon ? <Icon className="mb-3 h-10 w-10 text-gray-300" aria-hidden /> : null}
      <p className="font-bold text-ink">{title}</p>
      {body ? <p className="mt-1 max-w-md text-sm text-gray-500">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

// Table class names (plain <table> markup keeps pages server-rendered).
export const table = {
  wrap: "overflow-x-auto",
  table: "w-full text-left text-sm",
  thead: "border-b border-gray-200 bg-mist text-[11px] uppercase tracking-wider text-gray-500",
  th: "px-4 py-3 font-bold",
  tbody: "divide-y divide-gray-100 text-ink",
  tr: "hover:bg-mist/60",
  td: "px-4 py-3 align-top",
};

/** Small footnote shown under capped lists so nobody mistakes a page for "everything". */
export function CapNote({ shown, total, noun }: { shown: number; total: number; noun: string }) {
  if (total <= shown) return null;
  return (
    <p className="border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
      Showing the latest {shown.toLocaleString()} of {total.toLocaleString()} {noun}.
    </p>
  );
}
