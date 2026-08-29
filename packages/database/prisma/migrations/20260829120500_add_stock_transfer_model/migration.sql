-- CreateTable
CREATE TABLE "StockTransfer" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "fromWarehouseId" UUID NOT NULL,
    "toWarehouseId" UUID NOT NULL,
    "fromBranchId" UUID NOT NULL,
    "toBranchId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTransferLineItem" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "stockTransferId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "StockTransferLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StockTransfer_tenantId_id_key" ON "StockTransfer"("tenantId", "id");

-- CreateIndex
CREATE INDEX "StockTransfer_tenantId_status_idx" ON "StockTransfer"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StockTransferLineItem_tenantId_id_key" ON "StockTransferLineItem"("tenantId", "id");

-- CreateIndex
CREATE INDEX "StockTransferLineItem_tenantId_stockTransferId_idx" ON "StockTransferLineItem"("tenantId", "stockTransferId");

-- AddForeignKey
ALTER TABLE "StockTransfer"
    ADD CONSTRAINT "StockTransfer_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer"
    ADD CONSTRAINT "StockTransfer_fromWarehouseId_fkey"
    FOREIGN KEY ("fromWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer"
    ADD CONSTRAINT "StockTransfer_toWarehouseId_fkey"
    FOREIGN KEY ("toWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer"
    ADD CONSTRAINT "StockTransfer_tenantId_fromBranchId_fkey"
    FOREIGN KEY ("tenantId", "fromBranchId") REFERENCES "Branch"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer"
    ADD CONSTRAINT "StockTransfer_tenantId_toBranchId_fkey"
    FOREIGN KEY ("tenantId", "toBranchId") REFERENCES "Branch"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransferLineItem"
    ADD CONSTRAINT "StockTransferLineItem_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransferLineItem"
    ADD CONSTRAINT "StockTransferLineItem_stockTransferId_fkey"
    FOREIGN KEY ("stockTransferId") REFERENCES "StockTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransferLineItem"
    ADD CONSTRAINT "StockTransferLineItem_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
