-- AlterTable
ALTER TABLE "User" ADD COLUMN     "credits" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "usageChat" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "usageDivination" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "usageMaster" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "MasterSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messages" TEXT NOT NULL,
    "portrait" TEXT,
    "totalCreditsUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MasterSession_userId_key" ON "MasterSession"("userId");

-- CreateIndex
CREATE INDEX "MasterSession_userId_idx" ON "MasterSession"("userId");

-- AddForeignKey
ALTER TABLE "MasterSession" ADD CONSTRAINT "MasterSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
