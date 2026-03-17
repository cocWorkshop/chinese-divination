-- Add isAdmin and hourlyQuota to User
ALTER TABLE "User" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "hourlyQuota" INTEGER NOT NULL DEFAULT 10;

-- CreateTable RateLimit
CREATE TABLE "RateLimit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RateLimit_userId_windowStart_key" ON "RateLimit"("userId", "windowStart");
CREATE INDEX "RateLimit_userId_windowStart_idx" ON "RateLimit"("userId", "windowStart");

ALTER TABLE "RateLimit" ADD CONSTRAINT "RateLimit_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable AdminSetting
CREATE TABLE "AdminSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminSetting_pkey" PRIMARY KEY ("key")
);

-- Seed default admin settings
INSERT INTO "AdminSetting" ("key", "value", "updatedAt") VALUES ('defaultHourlyQuota', '10', NOW());
INSERT INTO "AdminSetting" ("key", "value", "updatedAt") VALUES ('divinationEnabled', 'true', NOW());
INSERT INTO "AdminSetting" ("key", "value", "updatedAt") VALUES ('maintenanceMode', 'false', NOW());
