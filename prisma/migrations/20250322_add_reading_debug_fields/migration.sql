-- Add divination debug/log fields to Reading table
ALTER TABLE "Reading" ADD COLUMN IF NOT EXISTS "calculationData" TEXT;
ALTER TABLE "Reading" ADD COLUMN IF NOT EXISTS "llmPrompt" TEXT;
ALTER TABLE "Reading" ADD COLUMN IF NOT EXISTS "llmRawOutput" TEXT;

-- Add full LLM prompt storage to LlmLog table
ALTER TABLE "LlmLog" ADD COLUMN IF NOT EXISTS "systemPrompt" TEXT;
