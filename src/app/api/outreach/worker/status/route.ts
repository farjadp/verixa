import { NextRequest, NextResponse } from "next/server";
import { prismaRepo } from "@/lib/outreach/repo";
import { getOutreachSettings } from "@/lib/outreach/settings";
import { computeWorkerStatus } from "@/lib/outreach/worker-status";
import { rejectUnlessWorker } from "../auth";

/** Kill-switch check the worker calls before every action. Fails closed: any error means "do not act". */
export async function GET(req: NextRequest) {
  const denied = rejectUnlessWorker(req);
  if (denied) return denied;
  const channel = new URL(req.url).searchParams.get("channel");
  if (channel !== "LINKEDIN" && channel !== "X") return NextResponse.json({ ok: false, error: "channel must be LINKEDIN or X" }, { status: 400 });
  try {
    const [settings, leads] = await Promise.all([getOutreachSettings(), prismaRepo.listInvitedLeads(channel)]);
    return NextResponse.json({ ok: true, ...computeWorkerStatus(settings, channel, leads) });
  } catch (e) {
    console.error("[worker/status]", e);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
