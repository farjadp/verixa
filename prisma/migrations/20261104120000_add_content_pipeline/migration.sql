-- AlterTable
ALTER TABLE "BlogPost" ADD COLUMN     "canonicalUrl" TEXT,
ADD COLUMN     "imageAlt" TEXT,
ADD COLUMN     "immigrationPaths" TEXT,
ADD COLUMN     "jsonLd" TEXT,
ADD COLUMN     "reviewScore" INTEGER,
ADD COLUMN     "source" TEXT DEFAULT 'MANUAL',
ADD COLUMN     "targetKeyword" TEXT;

-- CreateTable
CREATE TABLE "PipelineRun" (
    "id" TEXT NOT NULL,
    "trigger" TEXT NOT NULL DEFAULT 'CRON',
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "language" TEXT NOT NULL DEFAULT 'en',
    "targetCount" INTEGER NOT NULL DEFAULT 2,
    "discovered" INTEGER NOT NULL DEFAULT 0,
    "selected" INTEGER NOT NULL DEFAULT 0,
    "published" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "autoPublished" BOOLEAN NOT NULL DEFAULT false,
    "log" TEXT,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "PipelineRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentPipelineJob" (
    "id" TEXT NOT NULL,
    "pipelineRunId" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'DISCOVERED',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "dedupKey" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourceName" TEXT,
    "immigrationPaths" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "draftMarkdown" TEXT,
    "summary" TEXT,
    "outline" TEXT,
    "slug" TEXT,
    "targetKeyword" TEXT,
    "metaTitle" TEXT,
    "metaDesc" TEXT,
    "jsonLd" TEXT,
    "internalLinks" TEXT,
    "qualityScore" INTEGER,
    "reviewNotes" TEXT,
    "rejectionReason" TEXT,
    "coverImage" TEXT,
    "imageAlt" TEXT,
    "blogPostId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentPipelineJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentImage" (
    "id" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "alt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PipelineRun_status_startedAt_idx" ON "PipelineRun"("status", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContentPipelineJob_dedupKey_key" ON "ContentPipelineJob"("dedupKey");

-- CreateIndex
CREATE INDEX "ContentPipelineJob_stage_status_idx" ON "ContentPipelineJob"("stage", "status");

-- CreateIndex
CREATE INDEX "ContentPipelineJob_pipelineRunId_idx" ON "ContentPipelineJob"("pipelineRunId");

-- AddForeignKey
ALTER TABLE "ContentPipelineJob" ADD CONSTRAINT "ContentPipelineJob_pipelineRunId_fkey" FOREIGN KEY ("pipelineRunId") REFERENCES "PipelineRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

