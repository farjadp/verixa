import { NextRequest, NextResponse } from "next/server";
import { ALERT_UNSET_MESSAGE, isAlertConfigured } from "@/lib/outreach/config";
import { prismaRepo } from "@/lib/outreach/repo";
import { getOutreachSettings } from "@/lib/outreach/settings";
import { computeWorkerStatus } from "@/lib/outreach/worker-status";
import { rejectUnlessWorker } from "../auth";

let alertUnsetLogged = false;

/** Kill-switch check the worker calls before every action. Fails closed: any error means "do not act". */
export async function GET(req: NextRequest) {
  const denied = rejectUnlessWorker(req);
  if (denied) return denied;
  const channel = new URL(req.url).searchParams.get("channel");
  if (channel !== "LINKEDIN" && channel !== "X") return NextResponse.json({ ok: false, error: "channel must be LINKEDIN or X" }, { status: 400 });
  try {
    const [settings, leads] = await Promise.all([getOutreachSettings(), prismaRepo.listInvitedLeads(channel)]);
    const alertConfigured = isAlertConfigured();
    if (!alertConfigured && !alertUnsetLogged) {
      alertUnsetLogged = true;
      console.warn(`[worker/status] ${ALERT_UNSET_MESSAGE}`);
    }
    return NextResponse.json({ ok: true, ...computeWorkerStatus(settings, channel, leads, alertConfigured) });
  } catch (e) {
    console.error("[worker/status]", e);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
