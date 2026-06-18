-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "canceledAt" TIMESTAMP(3),
ADD COLUMN     "canceledByUserId" TEXT,
ADD COLUMN     "cancellationReason" TEXT;

-- CreateIndex
CREATE INDEX "sales_canceledByUserId_idx" ON "sales"("canceledByUserId");

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_canceledByUserId_fkey" FOREIGN KEY ("canceledByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
