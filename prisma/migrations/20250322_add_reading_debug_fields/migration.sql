-- Add divination debug/log fields to Reading table
ALTER TABLE "Reading" ADD COLUMN IF NOT EXISTS "calculationData" TEXT;
ALTER TABLE "Reading" ADD COLUMN IF NOT EXISTS "llmPrompt" TEXT;
ALTER TABLE "Reading" ADD COLUMN IF NOT EXISTS "llmRawOutput" TEXT;
