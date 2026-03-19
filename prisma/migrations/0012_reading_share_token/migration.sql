ALTER TABLE "Reading" ADD COLUMN "shareToken" TEXT;
CREATE UNIQUE INDEX "Reading_shareToken_key" ON "Reading"("shareToken");
