import { prisma } from "@/lib/prisma";
import { MrasSearchProvider } from "./providers/mras.provider";
import { FederalCorporationProvider } from "./providers/federal.provider";
import { CompanyMatchService } from "./match.service";

export class CompanyEnrichmentService {
  private mrasProvider = new MrasSearchProvider();
  private federalProvider = new FederalCorporationProvider();
  private matchService = new CompanyMatchService();

  async processJob(jobId: string) {
    const job = await prisma.companyEnrichmentJob.findUnique({
      where: { id: jobId },
      include: { consultantProfile: true }
    });

    if (!job || !job.consultantProfile || !job.rawCompanyName) return;

    try {
      await prisma.companyEnrichmentJob.update({
        where: { id: jobId },
        data: { status: "processing", attempts: job.attempts + 1 }
      });

      const rawName = job.rawCompanyName;
      const normalizedName = this.matchService.normalizeName(rawName);

      // 1. Search MRAS
      let candidates = await this.mrasProvider.searchByName({
        companyName: normalizedName,
        province: job.consultantProfile.province || undefined,
        city: job.consultantProfile.city || undefined
      });

      // 2. Search Federal
      const federalCandidates = await this.federalProvider.searchByName({
        companyName: normalizedName
      });
      candidates = [...candidates, ...federalCandidates];

      // 3. Score and choose best match
      const { bestMatch, confidenceScore, isAmbiguous } = this.matchService.chooseBestCandidate({
        normalizedInputName: normalizedName,
        consultantProvince: job.consultantProfile.province || undefined,
        candidates
      });

      let status = "not_found";
      let registrySource = null;
      let matchedLegalName = null;
      let jurisdiction = null;
      let registryNumber = null;
      let businessNumber = null;
      let incorporationDate = null;
      let registeredAddress = null;
      let companyStatus = null;
      let sourceUrl = null;

      // 4. Fetch Details if a match was found
      if (bestMatch) {
        status = isAmbiguous ? "ambiguous" : "matched";
        
        let details = null;
        if (bestMatch.registrySource === "mras") {
           details = await this.mrasProvider.getDetails({ jurisdiction: bestMatch.jurisdiction, registryNumber: bestMatch.registryNumber });
        } else if (bestMatch.registrySource === "federal_api") {
           details = await this.federalProvider.getDetails({ registryNumber: bestMatch.registryNumber });
        }

        if (details) {
          registrySource = details.registrySource;
          matchedLegalName = details.legalName;
          jurisdiction = details.jurisdiction;
          registryNumber = details.registryNumber;
          businessNumber = details.businessNumber;
          incorporationDate = details.incorporationDate;
          registeredAddress = details.registeredAddress;
          companyStatus = details.status;
          sourceUrl = details.sourceUrl;
        } else {
          status = "error";
        }
      }

      // Check if previously enriched to update vs create
      const existingEnrichment = await prisma.consultantCompanyEnrichment.findFirst({
        where: { consultantProfileId: job.consultantProfileId }
      });

      const enrichmentData = {
        rawCompanyName: rawName,
        normalizedName,
        matchStatus: status,
        confidenceScore,
        matchedLegalName,
        registrySource,
        jurisdiction,
        registryNumber,
        businessNumber,
        incorporationDate,
        registeredAddress,
        status: companyStatus,
        sourceUrl,
        lastCheckedAt: new Date()
      };

      if (existingEnrichment) {
        await prisma.consultantCompanyEnrichment.update({
          where: { id: existingEnrichment.id },
          data: enrichmentData
        });
      } else {
        await prisma.consultantCompanyEnrichment.create({
          data: {
             consultantProfileId: job.consultantProfileId,
             ...enrichmentData
          }
        });
      }

      // 5. Complete Job
      await prisma.companyEnrichmentJob.update({
        where: { id: jobId },
        data: { status: status === "ambiguous" ? "ambiguous" : "done" }
      });

    } catch (error) {
       await prisma.companyEnrichmentJob.update({
        where: { id: jobId },
        data: { 
          status: job.attempts >= 3 ? "failed" : "queued", 
          errorMessage: (error as Error).message 
        }
      });
    }
  }
}
