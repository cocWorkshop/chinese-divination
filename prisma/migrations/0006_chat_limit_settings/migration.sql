-- Chat daily limit settings
INSERT INTO "AdminSetting" ("key", "value", "updatedAt") VALUES ('freeDailyChat', '3', NOW()) ON CONFLICT ("key") DO NOTHING;
INSERT INTO "AdminSetting" ("key", "value", "updatedAt") VALUES ('paidDailyChat', '10', NOW()) ON CONFLICT ("key") DO NOTHING;
