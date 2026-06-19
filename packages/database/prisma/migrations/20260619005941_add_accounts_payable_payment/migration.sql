-- AlterTable
ALTER TABLE "accounts_payable" ADD COLUMN     "paidAmount" DECIMAL(12,2),
ADD COLUMN     "paidByUserId" TEXT,
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "paymentNotes" TEXT;

-- CreateIndex
CREATE INDEX "accounts_payable_paidByUserId_idx" ON "accounts_payable"("paidByUserId");

-- AddForeignKey
ALTER TABLE "accounts_payable" ADD CONSTRAINT "accounts_payable_paidByUserId_fkey" FOREIGN KEY ("paidByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
