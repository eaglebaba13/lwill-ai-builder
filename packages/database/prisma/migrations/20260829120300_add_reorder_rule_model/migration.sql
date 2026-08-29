-- CreateTable
CREATE TABLE "ReorderRule" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "minQuantity" INTEGER NOT NULL,
    "reorderQuantity" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReorderRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReorderRule_tenantId_id_key" ON "ReorderRule"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ReorderRule_tenantId_productId_branchId_warehouseId_key" ON "ReorderRule"("tenantId", "productId", "branchId", "warehouseId");

-- CreateIndex
CREATE INDEX "ReorderRule_tenantId_isActive_idx" ON "ReorderRule"("tenantId", "isActive");

-- AddForeignKey
ALTER TABLE "ReorderRule"
    ADD CONSTRAINT "ReorderRule_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReorderRule"
    ADD CONSTRAINT "ReorderRule_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReorderRule"
    ADD CONSTRAINT "ReorderRule_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReorderRule"
    ADD CONSTRAINT "ReorderRule_warehouseId_fkey"
    FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
