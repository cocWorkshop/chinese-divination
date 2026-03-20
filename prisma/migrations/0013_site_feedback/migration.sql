CREATE TABLE "SiteFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER,
    "feedback" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SiteFeedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SiteFeedback_createdAt_idx" ON "SiteFeedback"("createdAt");
CREATE INDEX "SiteFeedback_userId_idx" ON "SiteFeedback"("userId");
