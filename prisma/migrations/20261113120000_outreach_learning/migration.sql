-- Outreach learning: per-touch delivery outcomes, A/B variant, claim time, cron run log.
-- Additive only: nullable columns and a new table. Safe to deploy while outreach is running.

-- AlterTable
ALTER TABLE "OutreachLead" ADD COLUMN "claimedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "OutreachTouch" ADD COLUMN "variant" TEXT,
ADD COLUMN "deliveredAt" TIMESTAMP(3),
ADD COLUMN "bouncedAt" TIMESTAMP(3),
ADD COLUMN "bounceType" TEXT,
ADD COLUMN "bounceReason" TEXT,
ADD COLUMN "complainedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "OutreachRun" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "scheduled" INTEGER NOT NULL DEFAULT 0,
    "dryRun" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "followUpsHeld" INTEGER NOT NULL DEFAULT 0,
    "detail" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutreachRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OutreachRun_channel_startedAt_idx" ON "OutreachRun"("channel", "startedAt");
