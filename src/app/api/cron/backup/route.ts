// ============================================================================
// Hardware Source: src/app/api/cron/backup/route.ts
// Route: /api/cron/backup
// Version: 1.0.0 — 2026-04-08
// Why: Scheduled backup trigger for automated recovery and export workflows.
// Domain: Scheduled Jobs
// Env / Identity: Next.js Route Handler
// Owner: Verixa Web
// Notes: Cron endpoints must stay idempotent and reject unauthorized requests outside trusted scheduler headers.
// Critical Path: Background maintenance and automation.
// Primary Dependencies: Scheduler secret/header validation, queued jobs, mailer/backup services.
// Risk Notes: Cron behavior should be idempotent and safe to rerun.
// ============================================================================
import { NextResponse } from "next/server";
import { generateBackup } from "@/actions/backup.actions";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  
  // Vercel Cron sends a Bearer token matching CRON_SECRET automatically
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized Scheduled Trigger", { status: 401 });
  }

  try {
    const result = await generateBackup(process.env.CRON_SECRET);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
