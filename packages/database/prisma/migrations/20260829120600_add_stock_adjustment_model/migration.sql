-- CreateTable
CREATE TABLE "StockAdjustment" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "direction" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAdjustmentLineItem" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "stockAdjustmentId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "StockAdjustmentLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StockAdjustment_tenantId_id_key" ON "StockAdjustment"("tenantId", "id");

-- CreateIndex
CREATE INDEX "StockAdjustment_tenantId_direction_idx" ON "StockAdjustment"("tenantId", "direction");

-- CreateIndex
CREATE UNIQUE INDEX "StockAdjustmentLineItem_tenantId_id_key" ON "StockAdjustmentLineItem"("tenantId", "id");

-- CreateIndex
CREATE INDEX "StockAdjustmentLineItem_tenantId_stockAdjustmentId_idx" ON "StockAdjustmentLineItem"("tenantId", "stockAdjustmentId");

-- AddForeignKey
ALTER TABLE "StockAdjustment"
    ADD CONSTRAINT "StockAdjustment_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAdjustment"
    ADD CONSTRAINT "StockAdjustment_tenantId_branchId_fkey"
    FOREIGN KEY ("tenantId", "branchId") REFERENCES "Branch"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAdjustmentLineItem"
    ADD CONSTRAINT "StockAdjustmentLineItem_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAdjustmentLineItem"
    ADD CONSTRAINT "StockAdjustmentLineItem_stockAdjustmentId_fkey"
    FOREIGN KEY ("stockAdjustmentId") REFERENCES "StockAdjustment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAdjustmentLineItem"
    ADD CONSTRAINT "StockAdjustmentLineItem_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
