import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized: Admin access required" }, { status: 401 });
    }

    const campaigns = await (prisma as any).campaignLog.findMany({
      where: {
        type: "EMAIL",
        status: { in: ["QUEUED", "PROCESSING"] },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        status: true,
        subject: true,
        cohort: true,
        sentCount: true,
        successfulCount: true,
        failedCount: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      hasActive: campaigns.length > 0,
      campaigns,
    });
  } catch (error: any) {
    console.error("[Broadcast Active API] Failed:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load active campaigns." },
      { status: 500 }
    );
  }
}
