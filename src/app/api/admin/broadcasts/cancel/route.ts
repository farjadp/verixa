import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized: Admin access required" }, { status: 401 });
    }

    const result = await (prisma as any).campaignLog.updateMany({
      where: {
        type: "EMAIL",
        status: { in: ["QUEUED", "PROCESSING"] },
      },
      data: { status: "CANCELLED" },
    });

    revalidatePath("/dashboard/admin/broadcasts");
    return NextResponse.json({ success: true, cancelled: result.count });
  } catch (error: any) {
    console.error("[Broadcast Cancel API] Failed:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to cancel queued campaigns." },
      { status: 500 }
    );
  }
}
