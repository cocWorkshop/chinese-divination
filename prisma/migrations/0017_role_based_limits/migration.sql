-- Add bonusChat to User
ALTER TABLE "User" ADD COLUMN "bonusChat" INTEGER NOT NULL DEFAULT 0;

-- Migrate old settings to new per-role settings
-- Arcane (was free)
INSERT INTO "AdminSetting" (key, value, "updatedAt") VALUES ('arcane_daily_model1', COALESCE((SELECT value FROM "AdminSetting" WHERE key = 'freeDailyModel1'), '20'), NOW()) ON CONFLICT (key) DO NOTHING;
INSERT INTO "AdminSetting" (key, value, "updatedAt") VALUES ('arcane_daily_model2', COALESCE((SELECT value FROM "AdminSetting" WHERE key = 'freeDailyModel2'), '2'), NOW()) ON CONFLICT (key) DO NOTHING;
INSERT INTO "AdminSetting" (key, value, "updatedAt") VALUES ('arcane_daily_chat', COALESCE((SELECT value FROM "AdminSetting" WHERE key = 'freeDailyChat'), '3'), NOW()) ON CONFLICT (key) DO NOTHING;

-- Ethereal (was paid)
INSERT INTO "AdminSetting" (key, value, "updatedAt") VALUES ('ethereal_daily_model1', COALESCE((SELECT value FROM "AdminSetting" WHERE key = 'paidDailyModel1'), '-1'), NOW()) ON CONFLICT (key) DO NOTHING;
INSERT INTO "AdminSetting" (key, value, "updatedAt") VALUES ('ethereal_daily_model2', COALESCE((SELECT value FROM "AdminSetting" WHERE key = 'paidDailyModel2'), '20'), NOW()) ON CONFLICT (key) DO NOTHING;
INSERT INTO "AdminSetting" (key, value, "updatedAt") VALUES ('ethereal_daily_chat', COALESCE((SELECT value FROM "AdminSetting" WHERE key = 'paidDailyChat'), '10'), NOW()) ON CONFLICT (key) DO NOTHING;

-- Prestige (unlimited)
INSERT INTO "AdminSetting" (key, value, "updatedAt") VALUES ('prestige_daily_model1', '-1', NOW()) ON CONFLICT (key) DO NOTHING;
INSERT INTO "AdminSetting" (key, value, "updatedAt") VALUES ('prestige_daily_model2', '-1', NOW()) ON CONFLICT (key) DO NOTHING;
INSERT INTO "AdminSetting" (key, value, "updatedAt") VALUES ('prestige_daily_chat', '-1', NOW()) ON CONFLICT (key) DO NOTHING;
