import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/content-pipeline/cron-auth";
import { runHealth } from "@/lib/outreach/deps";

export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req.headers.get("authorization"), process.env.CRON_SECRET ?? "")) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, ...(await runHealth()) });
  } catch (e) {
    console.error("[cron/outreach-health]", e);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
