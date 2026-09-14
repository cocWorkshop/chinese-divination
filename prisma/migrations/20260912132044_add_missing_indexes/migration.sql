-- CreateIndex
CREATE INDEX "CreditLog_userId_createdAt_idx" ON "CreditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Reading_familyMemberId_idx" ON "Reading"("familyMemberId");

-- CreateIndex
CREATE INDEX "Reading_status_createdAt_idx" ON "Reading"("status", "createdAt");
