import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/content-pipeline/cron-auth";

/** Returns a 401 response when the worker token is missing or wrong; null when authorized. */
export function rejectUnlessWorker(req: NextRequest): NextResponse | null {
  const ok = isAuthorizedCronRequest(req.headers.get("authorization"), process.env.OUTREACH_WORKER_TOKEN ?? "");
  return ok ? null : NextResponse.json({ ok: false }, { status: 401 });
}
