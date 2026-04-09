// ============================================================================
// Hardware Source: src/app/api/cron/enrich-companies/route.ts
// Route: /api/cron/enrich-companies
// Version: 1.0.0 — 2026-04-08
// Why: Scheduled enrichment worker that processes queued company enrichment jobs.
// Domain: Scheduled Jobs
// Env / Identity: Next.js Route Handler
// Owner: Verixa Web
// Notes: Cron endpoints must stay idempotent and reject unauthorized requests outside trusted scheduler headers.
// Critical Path: Background maintenance and automation.
// Primary Dependencies: Scheduler secret/header validation, queued jobs, mailer/backup services.
// Risk Notes: Cron behavior should be idempotent and safe to rerun.
// ============================================================================
import { NextResponse } from "next/server";
import { CompanyEnrichmentService } from "@/services/enrichment/enrichment.service";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  // Protect route with chronological Vercel Cron header
  const authHeader = request.headers.get('authorization');
  
  if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
  }

  const batchSize = 10;
  
  const jobs = await prisma.companyEnrichmentJob.findMany({
    where: { status: { in: ["queued", "failed"] }, attempts: { lt: 3 } },
    take: batchSize,
    orderBy: { createdAt: "asc" }
  });

  const service = new CompanyEnrichmentService();
  
  for (const job of jobs) {
    await service.processJob(job.id);
  }

  return NextResponse.json({ processed: jobs.length, success: true });
}
