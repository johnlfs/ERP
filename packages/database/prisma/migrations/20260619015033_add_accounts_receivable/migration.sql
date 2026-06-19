-- CreateEnum
CREATE TYPE "AccountReceivableStatus" AS ENUM ('OPEN', 'RECEIVED', 'CANCELED');

-- CreateTable
CREATE TABLE "accounts_receivable" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "customerId" TEXT,
    "saleId" TEXT,
    "status" "AccountReceivableStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT NOT NULL,
    "document" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3),
    "receivedByUserId" TEXT,
    "receivedAmount" DECIMAL(12,2),
    "receiptMethod" TEXT,
    "receiptNotes" TEXT,
    "canceledAt" TIMESTAMP(3),
    "canceledByUserId" TEXT,
    "cancellationReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_receivable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_receivable_saleId_key" ON "accounts_receivable"("saleId");

-- CreateIndex
CREATE INDEX "accounts_receivable_storeId_dueDate_idx" ON "accounts_receivable"("storeId", "dueDate");

-- CreateIndex
CREATE INDEX "accounts_receivable_storeId_status_idx" ON "accounts_receivable"("storeId", "status");

-- CreateIndex
CREATE INDEX "accounts_receivable_customerId_dueDate_idx" ON "accounts_receivable"("customerId", "dueDate");

-- CreateIndex
CREATE INDEX "accounts_receivable_saleId_idx" ON "accounts_receivable"("saleId");

-- CreateIndex
CREATE INDEX "accounts_receivable_receivedByUserId_idx" ON "accounts_receivable"("receivedByUserId");

-- CreateIndex
CREATE INDEX "accounts_receivable_canceledByUserId_idx" ON "accounts_receivable"("canceledByUserId");

-- AddForeignKey
ALTER TABLE "accounts_receivable" ADD CONSTRAINT "accounts_receivable_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_receivable" ADD CONSTRAINT "accounts_receivable_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_receivable" ADD CONSTRAINT "accounts_receivable_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_receivable" ADD CONSTRAINT "accounts_receivable_receivedByUserId_fkey" FOREIGN KEY ("receivedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_receivable" ADD CONSTRAINT "accounts_receivable_canceledByUserId_fkey" FOREIGN KEY ("canceledByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
