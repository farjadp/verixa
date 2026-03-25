"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { CompanyEnrichmentService } from "@/services/enrichment/enrichment.service";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
}

export async function queueAllCompanies() {
  await requireAdmin();

  const consultants = await prisma.consultantProfile.findMany({
    where: {
      company: { not: null },
      NOT: { company: "" }
    }
  });

  let queuedCount = 0;
  for (const c of consultants) {
    if (!c.company) continue;

    const existingJob = await prisma.companyEnrichmentJob.findFirst({
      where: { consultantProfileId: c.id }
    });

    if (!existingJob) {
      await prisma.companyEnrichmentJob.create({
        data: {
          consultantProfileId: c.id,
          rawCompanyName: c.company,
          status: "queued"
        }
      });
      queuedCount++;
    }
  }

  return { queuedCount };
}

export async function processNextBatchAction(batchSize = 5) {
  await requireAdmin();
  const jobs = await prisma.companyEnrichmentJob.findMany({
    where: { status: "queued" },
    take: batchSize,
    orderBy: { createdAt: "asc" }
  });

  const service = new CompanyEnrichmentService();
  
  for (const job of jobs) {
    await service.processJob(job.id);
  }

  return { processed: jobs.length };
}

export async function approveAmbiguousMatch(enrichmentId: string) {
  await requireAdmin();
  await prisma.consultantCompanyEnrichment.update({
    where: { id: enrichmentId },
    data: { matchStatus: "matched" }
  });
  return { success: true };
}

export async function rejectAmbiguousMatch(enrichmentId: string) {
  await requireAdmin();
  await prisma.consultantCompanyEnrichment.update({
    where: { id: enrichmentId },
    data: { matchStatus: "not_found" } // or rejected
  });
  return { success: true };
}

export async function getEnrichmentJobs() {
  await requireAdmin();
  return prisma.companyEnrichmentJob.findMany({
    include: { consultantProfile: true },
    orderBy: { createdAt: "desc" }
  });
}

export async function getEnrichments() {
  await requireAdmin();
  return prisma.consultantCompanyEnrichment.findMany({
    include: { consultantProfile: true },
    orderBy: { createdAt: "desc" }
  });
}
