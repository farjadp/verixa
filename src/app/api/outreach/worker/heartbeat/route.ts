import { NextRequest, NextResponse } from "next/server";
import { recordHeartbeat } from "@/lib/outreach/settings";
import { rejectUnlessWorker } from "../auth";

export async function POST(req: NextRequest) {
  const denied = rejectUnlessWorker(req);
  if (denied) return denied;
  try {
    await recordHeartbeat(new Date());
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[worker/heartbeat]", e);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
