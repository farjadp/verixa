import { NextRequest, NextResponse } from "next/server";
import { prismaRepo } from "@/lib/outreach/repo";
import { computeSendable } from "@/lib/outreach/worker-status";
import { rejectUnlessWorker } from "../auth";

/** Called by the worker immediately before each send. Fails closed: errors are 500, unknown touches are not sendable. */
export async function GET(req: NextRequest) {
  const denied = rejectUnlessWorker(req);
  if (denied) return denied;
  const touchId = new URL(req.url).searchParams.get("touchId");
  if (!touchId) return NextResponse.json({ ok: false, error: "touchId required" }, { status: 400 });
  try {
    const check = await prismaRepo.getSendCheck(touchId);
    return NextResponse.json({ ok: true, ...(check ? computeSendable(check) : { sendable: false, reason: "unknown touch" }) });
  } catch (e) {
    console.error("[worker/lead-check]", e);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
