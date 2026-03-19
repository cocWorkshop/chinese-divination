-- CreateTable ReadingFeedback
CREATE TABLE "ReadingFeedback" (
    "id" TEXT NOT NULL,
    "readingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReadingFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReadingFeedback_readingId_userId_key" ON "ReadingFeedback"("readingId", "userId");
CREATE INDEX "ReadingFeedback_readingId_idx" ON "ReadingFeedback"("readingId");
CREATE INDEX "ReadingFeedback_userId_idx" ON "ReadingFeedback"("userId");

-- AddForeignKey
ALTER TABLE "ReadingFeedback" ADD CONSTRAINT "ReadingFeedback_readingId_fkey" FOREIGN KEY ("readingId") REFERENCES "Reading"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Soft delete: add deletedAt to Reading
ALTER TABLE "Reading" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Migrate existing feedback data to new table (if any)
INSERT INTO "ReadingFeedback" ("id", "readingId", "userId", "rating", "feedback", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, r."id", r."userId", r."rating", r."feedback", COALESCE(r."feedbackAt", NOW()), NOW()
FROM "Reading" r
WHERE r."rating" IS NOT NULL OR r."feedback" IS NOT NULL;

-- Drop old columns from Reading
ALTER TABLE "Reading" DROP COLUMN IF EXISTS "feedback";
ALTER TABLE "Reading" DROP COLUMN IF EXISTS "feedbackAt";
