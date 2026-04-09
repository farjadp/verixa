-- CreateTable
CREATE TABLE "ConsultantCompanyEnrichment" (
    "id" TEXT NOT NULL,
    "consultantProfileId" TEXT NOT NULL,
    "rawCompanyName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "matchStatus" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION,
    "matchedLegalName" TEXT,
    "registrySource" TEXT,
    "jurisdiction" TEXT,
    "registryNumber" TEXT,
    "businessNumber" TEXT,
    "incorporationDate" TIMESTAMP(3),
    "registeredAddress" TEXT,
    "status" TEXT,
    "sourceUrl" TEXT,
    "rawPayload" JSONB,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultantCompanyEnrichment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyEnrichmentJob" (
    "id" TEXT NOT NULL,
    "consultantProfileId" TEXT NOT NULL,
    "rawCompanyName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "runAfter" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyEnrichmentJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsultantCompanyEnrichment_consultantProfileId_idx" ON "ConsultantCompanyEnrichment"("consultantProfileId");

-- CreateIndex
CREATE INDEX "ConsultantCompanyEnrichment_matchStatus_idx" ON "ConsultantCompanyEnrichment"("matchStatus");

-- CreateIndex
CREATE INDEX "ConsultantCompanyEnrichment_jurisdiction_idx" ON "ConsultantCompanyEnrichment"("jurisdiction");

-- AddForeignKey
ALTER TABLE "ConsultantCompanyEnrichment" ADD CONSTRAINT "ConsultantCompanyEnrichment_consultantProfileId_fkey" FOREIGN KEY ("consultantProfileId") REFERENCES "ConsultantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyEnrichmentJob" ADD CONSTRAINT "CompanyEnrichmentJob_consultantProfileId_fkey" FOREIGN KEY ("consultantProfileId") REFERENCES "ConsultantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
