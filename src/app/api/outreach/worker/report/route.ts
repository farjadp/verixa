import { NextRequest, NextResponse } from "next/server";
import { haltChannel, realDeps } from "@/lib/outreach/deps";
import { applyReport, workerReportSchema } from "@/lib/outreach/engine";
import { rejectUnlessWorker } from "../auth";

export async function POST(req: NextRequest) {
  const denied = rejectUnlessWorker(req);
  if (denied) return denied;
  const parsed = workerReportSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
  try {
    return NextResponse.json(await applyReport(realDeps(), parsed.data, { haltChannel }));
  } catch (e) {
    console.error("[worker/report]", e);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
