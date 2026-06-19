-- CreateEnum
CREATE TYPE "CashMovementType" AS ENUM ('INFLOW', 'OUTFLOW');

-- CreateEnum
CREATE TYPE "CashMovementSource" AS ENUM ('ACCOUNT_PAYABLE', 'ACCOUNT_RECEIVABLE', 'MANUAL');

-- CreateTable
CREATE TABLE "cash_movements" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountPayableId" TEXT,
    "accountReceivableId" TEXT,
    "type" "CashMovementType" NOT NULL,
    "source" "CashMovementSource" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "document" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cash_movements_accountPayableId_key" ON "cash_movements"("accountPayableId");

-- CreateIndex
CREATE UNIQUE INDEX "cash_movements_accountReceivableId_key" ON "cash_movements"("accountReceivableId");

-- CreateIndex
CREATE INDEX "cash_movements_storeId_occurredAt_idx" ON "cash_movements"("storeId", "occurredAt");

-- CreateIndex
CREATE INDEX "cash_movements_storeId_type_idx" ON "cash_movements"("storeId", "type");

-- CreateIndex
CREATE INDEX "cash_movements_storeId_source_idx" ON "cash_movements"("storeId", "source");

-- CreateIndex
CREATE INDEX "cash_movements_userId_occurredAt_idx" ON "cash_movements"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "cash_movements_accountPayableId_idx" ON "cash_movements"("accountPayableId");

-- CreateIndex
CREATE INDEX "cash_movements_accountReceivableId_idx" ON "cash_movements"("accountReceivableId");

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_accountPayableId_fkey" FOREIGN KEY ("accountPayableId") REFERENCES "accounts_payable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_accountReceivableId_fkey" FOREIGN KEY ("accountReceivableId") REFERENCES "accounts_receivable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
