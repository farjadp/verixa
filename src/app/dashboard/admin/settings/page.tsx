// ============================================================================
// Hardware Source: src/app/dashboard/admin/settings/page.tsx
// Route: /dashboard/admin/settings
// Version: 1.0.0 — 2026-04-08
// Why: High-privilege admin route for platform governance, operations, and configuration workflows.
// Domain: Admin Operations
// Env / Identity: React Server Component
// Owner: Verixa Web
// Notes: Must remain server-auth gated for ADMIN users; avoid exposing privileged operations to client without checks.
// Critical Path: Privileged management surface affecting platform-wide data, policy, and operational behavior.
// Security Notes: Enforce ADMIN authorization server-side before reads/writes and before rendering sensitive payloads.
// Risk Notes: Regressions here can impact many users; prefer explicit guards and resilient fallbacks for DB calls.
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
