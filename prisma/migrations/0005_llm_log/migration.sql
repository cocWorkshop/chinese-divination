-- LLM Call Log table
CREATE TABLE IF NOT EXISTS "LlmLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "endpoint" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "modelTier" TEXT,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'success',
    "errorMessage" TEXT,
    "inputPreview" TEXT,
    "outputPreview" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LlmLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LlmLog_userId_idx" ON "LlmLog"("userId");
CREATE INDEX IF NOT EXISTS "LlmLog_createdAt_idx" ON "LlmLog"("createdAt");
CREATE INDEX IF NOT EXISTS "LlmLog_endpoint_idx" ON "LlmLog"("endpoint");
