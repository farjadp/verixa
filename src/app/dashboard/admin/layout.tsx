import { requireAdminPage } from "./_lib/guard";

// Defence in depth: each page also calls requireAdminPage() itself.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  return <div className="min-h-full bg-mist text-ink">{children}</div>;
}
