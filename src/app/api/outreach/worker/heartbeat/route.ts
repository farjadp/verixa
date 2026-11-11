import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { recordHeartbeat } from "@/lib/outreach/settings";
import { rejectUnlessWorker } from "../auth";

/** Body is optional so older workers keep working; `imapOk` is true only when that run read the inbox successfully. */
const bodySchema = z.object({ imapOk: z.boolean().optional() });

async function parseBody(req: NextRequest): Promise<z.infer<typeof bodySchema> | null> {
  const text = await req.text();
  if (!text.trim()) return {};
  try {
    const parsed = bodySchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const denied = rejectUnlessWorker(req);
  if (denied) return denied;
  try {
    const body = await parseBody(req);
    if (!body) return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
    await recordHeartbeat(new Date(), { inboxRead: body.imapOk === true });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[worker/heartbeat]", e);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
