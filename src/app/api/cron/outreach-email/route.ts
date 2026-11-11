import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/content-pipeline/cron-auth";
import { realDeps } from "@/lib/outreach/deps";
import { planEmailDay } from "@/lib/outreach/engine";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req.headers.get("authorization"), process.env.CRON_SECRET ?? "")) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    const result = await planEmailDay(realDeps());
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[cron/outreach-email]", e);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
