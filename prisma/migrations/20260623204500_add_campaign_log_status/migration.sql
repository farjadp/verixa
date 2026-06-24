ALTER TABLE "CampaignLog"
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'QUEUED';

UPDATE "CampaignLog"
SET "status" = CASE
  WHEN "successfulCount" = 0 AND "failedCount" = 0 THEN 'QUEUED'
  WHEN ("successfulCount" + "failedCount") < "sentCount" THEN 'PROCESSING'
  WHEN "successfulCount" = "sentCount" THEN 'COMPLETED'
  WHEN "failedCount" = "sentCount" THEN 'FAILED'
  ELSE 'PARTIAL'
END;
