import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function logSystemEvent(
  action: string,
  details: any = null,
  roleOverride?: string,
  userIdOverride?: string
) {
  try {
    let finalRole = roleOverride || "SYSTEM";
    let finalUserId = userIdOverride || null;

    if (!roleOverride || !userIdOverride) {
      try {
        const session = await getServerSession(authOptions);
        if (session && session.user) {
          finalRole = (session.user as any).role || finalRole;
          finalUserId = session.user.id || finalUserId;
        }
      } catch (e) {
        // getServerSession can fail if called from a pure server environment 
        // outside of app router / standard requests. Ignore safely.
      }
    }

    // Safely stringify details including properties of Error objects
    let detailsStr: string | null = null;
    if (details) {
      if (details instanceof Error) {
        detailsStr = JSON.stringify({
          message: details.message,
          name: details.name,
          stack: details.stack,
          // Extract axios/fetch common response payload if any
          apiResponse: (details as any).response?.data || (details as any).body || null
        });
      } else if (typeof details === "string") {
        try {
           JSON.parse(details);
           detailsStr = details;
        } catch {
           detailsStr = JSON.stringify({ message: details });
        }
      } else {
        detailsStr = JSON.stringify(details);
      }
    }

    await prisma.systemLog.create({
      data: {
        action,
        role: finalRole,
        userId: finalUserId,
        details: detailsStr,
      },
    });
  } catch (e) {
    console.error("[Logger Error] Failed to write system log:", e);
  }
}

// Legacy compatibility wrapper
export async function logEvent(params: { userId?: string | null, role?: string, action: string, details?: any, ipAddress?: string | null }) {
  await logSystemEvent(params.action, params.details, params.role, params.userId || undefined);
}
