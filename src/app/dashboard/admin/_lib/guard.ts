import { redirect } from "next/navigation";
import { requireAdmin, type AuthContext } from "@/lib/permissions";

/**
 * Page-level admin gate. Every admin page calls this first: the admin layout
 * also checks, but layouts do not re-run on every client navigation, so the
 * page is the boundary that actually protects the data it renders.
 */
export async function requireAdminPage(): Promise<AuthContext> {
  let ctx: AuthContext | null = null;
  try {
    ctx = await requireAdmin();
  } catch {
    ctx = null;
  }
  if (!ctx) redirect("/login");
  return ctx;
}
