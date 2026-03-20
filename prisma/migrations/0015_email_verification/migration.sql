ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "verificationToken" TEXT;
ALTER TABLE "User" ADD COLUMN "tokenExpiry" TIMESTAMP(3);
CREATE UNIQUE INDEX "User_verificationToken_key" ON "User"("verificationToken");

-- Mark all existing users as verified
UPDATE "User" SET "emailVerified" = true;
