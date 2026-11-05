"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { CompanyEnrichmentService } from "@/services/enrichment/enrichment.service";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
}

export async function queueAllCompanies(limit?: number) {
  await requireAdmin();

  const consultants = await prisma.consultantProfile.findMany({
    where: {
      company: { not: null },
      NOT: { company: "" }
    }
  });

  let queuedCount = 0;
  for (const c of consultants) {
    if (limit && queuedCount >= limit) break;
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

export async function updateEnrichmentRecord(id: string, data: {
  matchedLegalName: string;
  registryNumber: string;
  jurisdiction: string;
}) {
  await requireAdmin();
  try {
    const record = await prisma.consultantCompanyEnrichment.update({
      where: { id },
      data: {
        matchedLegalName: data.matchedLegalName,
        registryNumber: data.registryNumber,
        jurisdiction: data.jurisdiction,
      }
    });
    
    revalidatePath("/dashboard/admin/enrichment");
    return { success: true, record };
  } catch (error) {
    return { success: false, error: "Failed to update record" };
  }
}

export async function consultantVerifyEnrichment(id: string) {
  // Consultants may only confirm corporate records attached to their own profile.
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "CONSULTANT") {
    return { success: false, error: "Only the consultant can confirm this record." };
  }
  try {
    const profile = await prisma.consultantProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, licenseNumber: true },
    });
    if (!profile) return { success: false, error: "Consultant profile not found." };

    const res = await prisma.consultantCompanyEnrichment.updateMany({
      where: { id, consultantProfileId: profile.id },
      data: { matchStatus: "consultant_verified" },
    });
    if (res.count === 0) return { success: false, error: "Record not found." };

    revalidatePath("/dashboard/profile");
    revalidatePath(`/consultant/${profile.licenseNumber}`);
    return { success: true };
  } catch (error) {
    console.error("[consultantVerifyEnrichment] failed:", error);
    return { success: false, error: "Failed to verify record" };
  }
}
