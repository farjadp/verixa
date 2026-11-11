import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { prismaRepo } from "@/lib/outreach/repo";
import { getOutreachSettings } from "@/lib/outreach/settings";
import { toWorkerCandidates } from "@/lib/outreach/worker-status";
import { rejectUnlessWorker } from "../auth";

/** Profiles the worker should try to match on LinkedIn/X. Returns names only, never contact data. */
export async function GET(req: NextRequest) {
  const denied = rejectUnlessWorker(req);
  if (denied) return denied;
  const limit = Math.min(Math.max(Number(new URL(req.url).searchParams.get("limit") ?? 13) || 13, 1), 34);
  try {
    if (!(await getOutreachSettings()).enabled) return NextResponse.json({ ok: true, candidates: [] });
    const ids = (await prismaRepo.findDiscoveryCandidates(limit)).map((c) => c.consultantProfileId);
    const candidates = await prisma.consultantProfile.findMany({
      where: { id: { in: ids } },
      select: { id: true, fullName: true, company: true, city: true, province: true, licenseNumber: true, country: true },
    });
    return NextResponse.json({ ok: true, candidates: toWorkerCandidates(candidates) });
  } catch (e) {
    console.error("[worker/candidates]", e);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
