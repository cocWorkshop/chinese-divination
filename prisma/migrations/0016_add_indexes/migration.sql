-- Reading indexes
CREATE INDEX IF NOT EXISTS "Reading_userId_idx" ON "Reading"("userId");
CREATE INDEX IF NOT EXISTS "Reading_createdAt_idx" ON "Reading"("createdAt");
CREATE INDEX IF NOT EXISTS "Reading_userId_deletedAt_idx" ON "Reading"("userId", "deletedAt");
CREATE INDEX IF NOT EXISTS "Reading_type_idx" ON "Reading"("type");

-- ShareLink index
CREATE INDEX IF NOT EXISTS "ShareLink_userId_idx" ON "ShareLink"("userId");
