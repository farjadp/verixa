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
