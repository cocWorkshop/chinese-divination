-- CreateTable
CREATE TABLE "AuthLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "reason" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuthLog_createdAt_idx" ON "AuthLog"("createdAt");
CREATE INDEX "AuthLog_email_idx" ON "AuthLog"("email");
CREATE INDEX "AuthLog_action_idx" ON "AuthLog"("action");
CREATE INDEX "AuthLog_status_idx" ON "AuthLog"("status");
