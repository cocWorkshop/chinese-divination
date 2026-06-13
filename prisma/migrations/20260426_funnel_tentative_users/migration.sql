-- Funnel / tentative-user fields (ad landing flow at /start).
--
-- Tentative users are created by POST /api/start/init when a visitor
-- enters their email at View 2 of the ad funnel. They have an email
-- and a Reading row but no password until /start/unlock completes.
-- All compare(password, user.password) call sites must null-guard
-- before calling bcrypt.compare on the new nullable column.
--
-- Backwards compatibility: existing rows have tentative=false (the
-- default), so their behavior is unchanged. trialCreditsGranted=false
-- on existing rows is also fine — they cannot reach the funnel grant
-- code path because the email lookup short-circuits to "already a
-- registered user" for non-tentative matches.

ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;

ALTER TABLE "User" ADD COLUMN "tentative" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "signupCompletedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "trialCreditsGranted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "funnelSource" JSONB;

-- Index for the funnel completion lookup (find all tentative rows
-- older than N days for GDPR cleanup cron).
CREATE INDEX "User_tentative_createdAt_idx" ON "User"("tentative", "createdAt");
