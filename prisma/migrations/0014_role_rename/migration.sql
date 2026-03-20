-- Rename roles: free→arcane, paid→ethereal, premium→prestige
UPDATE "User" SET role = 'arcane' WHERE role = 'free';
UPDATE "User" SET role = 'ethereal' WHERE role = 'paid';
UPDATE "User" SET role = 'prestige' WHERE role = 'premium';

-- Update divination tier settings: normal→arcane, premium→prestige
UPDATE "AdminSetting" SET value = 'arcane' WHERE key LIKE 'divinationType_%_tier' AND value = 'normal';
UPDATE "AdminSetting" SET value = 'prestige' WHERE key LIKE 'divinationType_%_tier' AND value = 'premium';

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'arcane';
