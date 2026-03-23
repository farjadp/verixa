// ============================================================================
// Hardware Source: dashboard/admin/settings/page.tsx
// Route: /dashboard/admin/settings
// Version: 1.0.0 — 2026-03-23
// Why: Route entry for /dashboard/admin/settings
// Env / Identity: React Server Component
// Owner: Verixa Web
// ============================================================================

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PlatformSettingsClient from "./PlatformSettingsClient";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") redirect("/login");

  const settings = await prisma.platformSetting.findMany();
  const settingsMap = settings.reduce((acc, curr) => ({
    ...acc,
    [curr.key]: curr.value
  }), {} as Record<string, string>);

  return (
    <div className="p-8">
      <PlatformSettingsClient initialSettings={settingsMap} />
    </div>
  );
}
