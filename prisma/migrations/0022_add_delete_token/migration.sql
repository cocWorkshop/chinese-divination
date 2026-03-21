-- AlterTable
ALTER TABLE "User" ADD COLUMN "deleteToken" TEXT,
ADD COLUMN "deleteTokenExpiry" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_deleteToken_key" ON "User"("deleteToken");
