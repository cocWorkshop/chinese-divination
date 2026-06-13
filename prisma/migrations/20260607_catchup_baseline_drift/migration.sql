-- Catch-up / baseline migration: reconciles the migration history with the
-- live schema after a period of `prisma db push` usage (master-memory tables,
-- wiki, gift links, credit ledger, Stripe fields, MasterSession.tzOffsetMin, etc.).
-- On databases already at the current schema (db-pushed), mark this as applied
-- with `prisma migrate resolve --applied 20260607_catchup_baseline_drift` instead
-- of running it. A fresh DB gets the full 29 migrations + this one.

-- DropIndex
DROP INDEX "RateLimit_userId_windowStart_key";

-- DropIndex
DROP INDEX "User_tentative_createdAt_idx";

-- AlterTable
ALTER TABLE "FamilyMember" ADD COLUMN     "birthLat" DOUBLE PRECISION,
ADD COLUMN     "birthLng" DOUBLE PRECISION,
ADD COLUMN     "exactTime" TEXT,
ADD COLUMN     "relationDetail" TEXT;

-- AlterTable
ALTER TABLE "MasterSession" DROP COLUMN "messages",
DROP COLUMN "portrait",
ADD COLUMN     "tzOffsetMin" INTEGER;

-- AlterTable
ALTER TABLE "Reading" ADD COLUMN     "chatMessages" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'completed';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "birthEnvironment" TEXT,
ADD COLUMN     "birthLat" DOUBLE PRECISION,
ADD COLUMN     "birthLng" DOUBLE PRECISION,
ADD COLUMN     "chatCredits" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "divinationCredits" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "exactTime" TEXT,
ADD COLUMN     "lastDailyBonus" TIMESTAMP(3),
ADD COLUMN     "masterMemoryDisclosureSeenAt" TIMESTAMP(3),
ADD COLUMN     "portraitEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "subscriptionStatus" TEXT,
ALTER COLUMN "role" SET DEFAULT 'user';

-- CreateTable
CREATE TABLE "CreditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WikiArticle" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "coverImage" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WikiArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftLink" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "maxClaims" INTEGER NOT NULL DEFAULT 1,
    "claimCount" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftClaim" (
    "id" TEXT NOT NULL,
    "giftLinkId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WelcomeRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "condition" JSONB NOT NULL,
    "messages" JSONB NOT NULL,
    "recommendType" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WelcomeRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterChatMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "turnIndex" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT,
    "toolCallsJson" TEXT,
    "toolCallId" TEXT,
    "tokenCount" INTEGER,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MasterChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPortrait" (
    "userId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "topics" TEXT NOT NULL,
    "preferences" TEXT NOT NULL,
    "lifeContext" TEXT,
    "toneNotes" TEXT,
    "generatedPrompt" TEXT,
    "lastExtractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastTurnIndexCovered" INTEGER NOT NULL DEFAULT 0,
    "lastManualEditAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPortrait_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "UserPortraitHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "topics" TEXT NOT NULL,
    "preferences" TEXT NOT NULL,
    "lifeContext" TEXT,
    "toneNotes" TEXT,
    "trigger" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPortraitHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAccessLog" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreditLog_userId_idx" ON "CreditLog"("userId");

-- CreateIndex
CREATE INDEX "CreditLog_createdAt_idx" ON "CreditLog"("createdAt");

-- CreateIndex
CREATE INDEX "CreditLog_action_idx" ON "CreditLog"("action");

-- CreateIndex
CREATE UNIQUE INDEX "WikiArticle_slug_key" ON "WikiArticle"("slug");

-- CreateIndex
CREATE INDEX "WikiArticle_category_idx" ON "WikiArticle"("category");

-- CreateIndex
CREATE INDEX "WikiArticle_published_idx" ON "WikiArticle"("published");

-- CreateIndex
CREATE INDEX "WikiArticle_sortOrder_idx" ON "WikiArticle"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "GiftLink_code_key" ON "GiftLink"("code");

-- CreateIndex
CREATE INDEX "GiftLink_code_idx" ON "GiftLink"("code");

-- CreateIndex
CREATE INDEX "GiftLink_createdAt_idx" ON "GiftLink"("createdAt");

-- CreateIndex
CREATE INDEX "GiftClaim_userId_idx" ON "GiftClaim"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GiftClaim_giftLinkId_userId_key" ON "GiftClaim"("giftLinkId", "userId");

-- CreateIndex
CREATE INDEX "MasterChatMessage_userId_sessionId_turnIndex_idx" ON "MasterChatMessage"("userId", "sessionId", "turnIndex");

-- CreateIndex
CREATE INDEX "MasterChatMessage_userId_sessionId_archivedAt_idx" ON "MasterChatMessage"("userId", "sessionId", "archivedAt");

-- CreateIndex
CREATE INDEX "MasterChatMessage_userId_createdAt_idx" ON "MasterChatMessage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserPortraitHistory_userId_version_idx" ON "UserPortraitHistory"("userId", "version");

-- CreateIndex
CREATE INDEX "UserPortraitHistory_userId_createdAt_idx" ON "UserPortraitHistory"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAccessLog_adminUserId_createdAt_idx" ON "AdminAccessLog"("adminUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAccessLog_targetUserId_createdAt_idx" ON "AdminAccessLog"("targetUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- AddForeignKey
ALTER TABLE "GiftClaim" ADD CONSTRAINT "GiftClaim_giftLinkId_fkey" FOREIGN KEY ("giftLinkId") REFERENCES "GiftLink"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterChatMessage" ADD CONSTRAINT "MasterChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPortrait" ADD CONSTRAINT "UserPortrait_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPortraitHistory" ADD CONSTRAINT "UserPortraitHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAccessLog" ADD CONSTRAINT "AdminAccessLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAccessLog" ADD CONSTRAINT "AdminAccessLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

