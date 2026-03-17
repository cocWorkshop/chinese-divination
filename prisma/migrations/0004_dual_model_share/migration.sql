-- User: add isPaid, bonusModel1, bonusModel2
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isPaid" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bonusModel1" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bonusModel2" INTEGER NOT NULL DEFAULT 0;

-- Reading: add modelTier
ALTER TABLE "Reading" ADD COLUMN IF NOT EXISTS "modelTier" TEXT NOT NULL DEFAULT 'model1';

-- RateLimit: add modelTier, update unique constraint
ALTER TABLE "RateLimit" ADD COLUMN IF NOT EXISTS "modelTier" TEXT NOT NULL DEFAULT 'model1';
ALTER TABLE "RateLimit" DROP CONSTRAINT IF EXISTS "RateLimit_userId_windowStart_key";
CREATE UNIQUE INDEX IF NOT EXISTS "RateLimit_userId_windowStart_modelTier_key" ON "RateLimit"("userId", "windowStart", "modelTier");

-- ShareLink table
CREATE TABLE IF NOT EXISTS "ShareLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedBy" TEXT,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShareLink_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ShareLink_code_key" ON "ShareLink"("code");
ALTER TABLE "ShareLink" DROP CONSTRAINT IF EXISTS "ShareLink_userId_fkey";
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- New admin settings
INSERT INTO "AdminSetting" ("key", "value", "updatedAt") VALUES ('model1Name', 'anthropic/claude-3-5-haiku', NOW()) ON CONFLICT ("key") DO NOTHING;
INSERT INTO "AdminSetting" ("key", "value", "updatedAt") VALUES ('model2Name', 'anthropic/claude-sonnet-4', NOW()) ON CONFLICT ("key") DO NOTHING;
INSERT INTO "AdminSetting" ("key", "value", "updatedAt") VALUES ('model1Label', '标准模型 / Standard', NOW()) ON CONFLICT ("key") DO NOTHING;
INSERT INTO "AdminSetting" ("key", "value", "updatedAt") VALUES ('model2Label', '高级模型 / Premium', NOW()) ON CONFLICT ("key") DO NOTHING;
INSERT INTO "AdminSetting" ("key", "value", "updatedAt") VALUES ('freeDailyModel1', '20', NOW()) ON CONFLICT ("key") DO NOTHING;
INSERT INTO "AdminSetting" ("key", "value", "updatedAt") VALUES ('freeDailyModel2', '2', NOW()) ON CONFLICT ("key") DO NOTHING;
INSERT INTO "AdminSetting" ("key", "value", "updatedAt") VALUES ('paidDailyModel1', '-1', NOW()) ON CONFLICT ("key") DO NOTHING;
INSERT INTO "AdminSetting" ("key", "value", "updatedAt") VALUES ('paidDailyModel2', '20', NOW()) ON CONFLICT ("key") DO NOTHING;
INSERT INTO "AdminSetting" ("key", "value", "updatedAt") VALUES ('shareBonus', '20', NOW()) ON CONFLICT ("key") DO NOTHING;
