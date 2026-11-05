-- CreateTable
CREATE TABLE "OutreachLead" (
    "id" TEXT NOT NULL,
    "consultantProfileId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "externalHandle" TEXT,
    "matchConfidence" DOUBLE PRECISION,
    "score" INTEGER NOT NULL DEFAULT 0,
    "touchCount" INTEGER NOT NULL DEFAULT 0,
    "nextActionAt" TIMESTAMP(3),
    "backlogSince" TIMESTAMP(3),
    "recontactUsed" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'America/Toronto',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutreachLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachTouch" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "step" INTEGER NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "externalMessageId" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutreachTouch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachReply" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutreachReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachSuppression" (
    "id" TEXT NOT NULL,
    "consultantProfileId" TEXT NOT NULL,
    "email" TEXT,
    "linkedinUrl" TEXT,
    "xHandle" TEXT,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutreachSuppression_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OutreachLead_consultantProfileId_key" ON "OutreachLead"("consultantProfileId");

-- CreateIndex
CREATE INDEX "OutreachLead_channel_state_idx" ON "OutreachLead"("channel", "state");

-- CreateIndex
CREATE INDEX "OutreachLead_nextActionAt_idx" ON "OutreachLead"("nextActionAt");

-- CreateIndex
CREATE UNIQUE INDEX "OutreachTouch_idempotencyKey_key" ON "OutreachTouch"("idempotencyKey");

-- CreateIndex
CREATE INDEX "OutreachTouch_leadId_idx" ON "OutreachTouch"("leadId");

-- CreateIndex
CREATE INDEX "OutreachTouch_externalMessageId_idx" ON "OutreachTouch"("externalMessageId");

-- CreateIndex
CREATE INDEX "OutreachTouch_channel_createdAt_idx" ON "OutreachTouch"("channel", "createdAt");

-- CreateIndex
CREATE INDEX "OutreachReply_leadId_receivedAt_idx" ON "OutreachReply"("leadId", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OutreachSuppression_consultantProfileId_key" ON "OutreachSuppression"("consultantProfileId");

-- CreateIndex
CREATE INDEX "OutreachSuppression_email_idx" ON "OutreachSuppression"("email");

-- AddForeignKey
ALTER TABLE "OutreachLead" ADD CONSTRAINT "OutreachLead_consultantProfileId_fkey" FOREIGN KEY ("consultantProfileId") REFERENCES "ConsultantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachTouch" ADD CONSTRAINT "OutreachTouch_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "OutreachLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachReply" ADD CONSTRAINT "OutreachReply_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "OutreachLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

