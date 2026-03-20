-- CreateTable
CREATE TABLE "Compensation" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'manual',
    "sourceIds" TEXT,
    "bonusModel1" INTEGER NOT NULL DEFAULT 0,
    "bonusModel2" INTEGER NOT NULL DEFAULT 0,
    "bonusChat" INTEGER NOT NULL DEFAULT 0,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Compensation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Compensation_token_key" ON "Compensation"("token");
CREATE INDEX "Compensation_email_idx" ON "Compensation"("email");
CREATE INDEX "Compensation_status_idx" ON "Compensation"("status");
CREATE INDEX "Compensation_token_idx" ON "Compensation"("token");
