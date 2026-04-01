/**
 * src/lib/permissions.ts — Issue 12: Centralized Authorization
 *
 * This file consolidates the authorization logic that was previously scattered
 * across 20+ action files. Instead of each file doing its own getServerSession()
 * + role check, they import from here.
 *
 * USAGE — Replace this pattern:
 *   const session = await getServerSession(authOptions);
 *   if (!session || (session.user as any).role !== "ADMIN") throw new Error("Unauthorized");
 *   const userId = (session.user as any).id;
 *
 * With this:
 *   const { userId } = await requireAdmin();
 *   // or
 *   const { userId, role } = await requireAuth();
 *
 * Rollout strategy: Used as example in claim.actions.ts and booking.actions.ts.
 * Other action files can migrate incrementally — no breaking changes.
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

// ── Return type shared by all helpers ────────────────────────────────────────
export interface AuthContext {
  userId: string;
  role: string;
  email: string | null | undefined;
}

// ── 1. requireAuth ────────────────────────────────────────────────────────────
// Use for any route that requires a logged-in user (any role).
export async function requireAuth(): Promise<AuthContext> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Unauthorized: You must be logged in to perform this action.");
  }

  return {
    userId: session.user.id,
    role: session.user.role,
    email: session.user.email,
  };
}

// ── 2. requireRole ────────────────────────────────────────────────────────────
// Use for routes restricted to a specific role.
export async function requireRole(
  requiredRole: "ADMIN" | "CONSULTANT" | "USER"
): Promise<AuthContext> {
  const ctx = await requireAuth();

  if (ctx.role !== requiredRole) {
    throw new Error(
      `Forbidden: This action requires ${requiredRole} role. Your role is ${ctx.role}.`
    );
  }

  return ctx;
}

// ── 3. requireAdmin ───────────────────────────────────────────────────────────
// Convenience wrapper — most common permission check in admin actions.
export async function requireAdmin(): Promise<AuthContext> {
  return requireRole("ADMIN");
}

// ── 4. requireConsultant ──────────────────────────────────────────────────────
export async function requireConsultant(): Promise<AuthContext> {
  return requireRole("CONSULTANT");
}

// ── 5. assertOwnership ───────────────────────────────────────────────────────
// Use for resource-level checks (e.g. a user can only edit their OWN profile).
// Pass the resource's ownerUserId and the current user's id.
// Admins bypass ownership checks automatically.
export function assertOwnership(
  resourceOwnerUserId: string,
  actorUserId: string,
  actorRole: string
): void {
  if (actorRole === "ADMIN") return; // admins can access everything

  if (resourceOwnerUserId !== actorUserId) {
    throw new Error(
      "Forbidden: You do not have permission to modify this resource."
    );
  }
}
