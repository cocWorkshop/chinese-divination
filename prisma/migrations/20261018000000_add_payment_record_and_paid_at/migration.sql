-- AlterTable
ALTER TABLE "User" ADD COLUMN "paidAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PaymentRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "stripeCustomerId" TEXT,
    "packId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "credits" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRecord_stripeSessionId_key" ON "PaymentRecord"("stripeSessionId");

-- CreateIndex
CREATE INDEX "PaymentRecord_userId_idx" ON "PaymentRecord"("userId");

-- CreateIndex
CREATE INDEX "PaymentRecord_createdAt_idx" ON "PaymentRecord"("createdAt");

-- CreateIndex
CREATE INDEX "PaymentRecord_status_idx" ON "PaymentRecord"("status");

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
