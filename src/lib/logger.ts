import { prisma } from "./prisma";
import { headers } from "next/headers";

type LogEventParams = {
  userId?: string;
  role?: string;
  action: string;
  details?: any;
};

export async function logEvent({ userId, role, action, details }: LogEventParams) {
  try {
    let ipAddress = "unknown";
    try {
      const headersList = await headers();
      ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown";
    } catch (e) {
      // Ignore header errors if not called within a request context
    }

    await prisma.systemLog.create({
      data: {
        userId,
        role,
        action,
        details: details ? JSON.stringify(details) : null,
        ipAddress
      }
    });
  } catch (error) {
    // Fail silently to prevent interrupting main app flow
    console.error("Logger Failed:", error);
  }
}
