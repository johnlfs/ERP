-- CreateEnum
CREATE TYPE "AccountPayableStatus" AS ENUM ('OPEN', 'PAID', 'CANCELED');

-- CreateTable
CREATE TABLE "accounts_payable" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "supplierId" TEXT,
    "purchaseId" TEXT,
    "status" "AccountPayableStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT NOT NULL,
    "document" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "canceledByUserId" TEXT,
    "cancellationReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_payable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_payable_purchaseId_key" ON "accounts_payable"("purchaseId");

-- CreateIndex
CREATE INDEX "accounts_payable_storeId_dueDate_idx" ON "accounts_payable"("storeId", "dueDate");

-- CreateIndex
CREATE INDEX "accounts_payable_storeId_status_idx" ON "accounts_payable"("storeId", "status");

-- CreateIndex
CREATE INDEX "accounts_payable_supplierId_dueDate_idx" ON "accounts_payable"("supplierId", "dueDate");

-- CreateIndex
CREATE INDEX "accounts_payable_purchaseId_idx" ON "accounts_payable"("purchaseId");

-- CreateIndex
CREATE INDEX "accounts_payable_canceledByUserId_idx" ON "accounts_payable"("canceledByUserId");

-- AddForeignKey
ALTER TABLE "accounts_payable" ADD CONSTRAINT "accounts_payable_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_payable" ADD CONSTRAINT "accounts_payable_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_payable" ADD CONSTRAINT "accounts_payable_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_payable" ADD CONSTRAINT "accounts_payable_canceledByUserId_fkey" FOREIGN KEY ("canceledByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
