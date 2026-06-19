-- AlterTable
ALTER TABLE "purchases" ADD COLUMN     "canceledAt" TIMESTAMP(3),
ADD COLUMN     "canceledByUserId" TEXT,
ADD COLUMN     "cancellationReason" TEXT;

-- CreateIndex
CREATE INDEX "purchases_canceledByUserId_idx" ON "purchases"("canceledByUserId");

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_canceledByUserId_fkey" FOREIGN KEY ("canceledByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
