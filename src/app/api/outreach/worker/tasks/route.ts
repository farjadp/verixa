import { NextRequest, NextResponse } from "next/server";
import { realDeps } from "@/lib/outreach/deps";
import { buildSocialTasks } from "@/lib/outreach/engine";
import { rejectUnlessWorker } from "../auth";

export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const denied = rejectUnlessWorker(req);
  if (denied) return denied;
  const channel = new URL(req.url).searchParams.get("channel");
  if (channel !== "LINKEDIN" && channel !== "X") return NextResponse.json({ ok: false, error: "channel must be LINKEDIN or X" }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, tasks: await buildSocialTasks(realDeps(), channel) });
  } catch (e) {
    console.error("[worker/tasks]", e);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
