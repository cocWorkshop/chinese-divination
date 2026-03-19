CREATE TABLE "FrontendError" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "endpoint" TEXT NOT NULL,
    "status" INTEGER,
    "error" TEXT NOT NULL,
    "context" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FrontendError_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FrontendError_createdAt_idx" ON "FrontendError"("createdAt");
CREATE INDEX "FrontendError_userId_idx" ON "FrontendError"("userId");
