-- Add role field to User (replaces isPaid boolean with flexible role system)
ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'free';

-- Migrate existing data: isPaid=true → 'paid', isAdmin=true → 'admin'
UPDATE "User" SET "role" = 'paid' WHERE "isPaid" = true;
UPDATE "User" SET "role" = 'admin' WHERE "isAdmin" = true;

-- Admin settings for divination type tiers
INSERT INTO "AdminSetting" ("key", "value", "updatedAt") VALUES ('divinationType_bazi_tier', 'normal', NOW()) ON CONFLICT ("key") DO NOTHING;
INSERT INTO "AdminSetting" ("key", "value", "updatedAt") VALUES ('divinationType_iching_tier', 'normal', NOW()) ON CONFLICT ("key") DO NOTHING;
INSERT INTO "AdminSetting" ("key", "value", "updatedAt") VALUES ('divinationType_ziwei_tier', 'premium', NOW()) ON CONFLICT ("key") DO NOTHING;
INSERT INTO "AdminSetting" ("key", "value", "updatedAt") VALUES ('divinationType_qimen_tier', 'premium', NOW()) ON CONFLICT ("key") DO NOTHING;
INSERT INTO "AdminSetting" ("key", "value", "updatedAt") VALUES ('divinationType_fengshui_tier', 'premium', NOW()) ON CONFLICT ("key") DO NOTHING;
INSERT INTO "AdminSetting" ("key", "value", "updatedAt") VALUES ('divinationType_other_tier', 'premium', NOW()) ON CONFLICT ("key") DO NOTHING;
