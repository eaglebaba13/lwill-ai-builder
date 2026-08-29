-- CreateTable
CREATE TABLE "PurchaseReceipt" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "supplierId" UUID,
    "warehouseId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "receivedBy" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseReceiptLineItem" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "purchaseReceiptId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "PurchaseReceiptLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseReceipt_tenantId_id_key" ON "PurchaseReceipt"("tenantId", "id");

-- CreateIndex
CREATE INDEX "PurchaseReceipt_tenantId_receivedAt_idx" ON "PurchaseReceipt"("tenantId", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseReceiptLineItem_tenantId_id_key" ON "PurchaseReceiptLineItem"("tenantId", "id");

-- CreateIndex
CREATE INDEX "PurchaseReceiptLineItem_tenantId_purchaseReceiptId_idx" ON "PurchaseReceiptLineItem"("tenantId", "purchaseReceiptId");

-- AddForeignKey
ALTER TABLE "PurchaseReceipt"
    ADD CONSTRAINT "PurchaseReceipt_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceipt"
    ADD CONSTRAINT "PurchaseReceipt_supplierId_fkey"
    FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceipt"
    ADD CONSTRAINT "PurchaseReceipt_warehouseId_fkey"
    FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceipt"
    ADD CONSTRAINT "PurchaseReceipt_branchId_fkey"
    FOREIGN KEY ("tenantId", "branchId") REFERENCES "Branch"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceiptLineItem"
    ADD CONSTRAINT "PurchaseReceiptLineItem_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceiptLineItem"
    ADD CONSTRAINT "PurchaseReceiptLineItem_purchaseReceiptId_fkey"
    FOREIGN KEY ("purchaseReceiptId") REFERENCES "PurchaseReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceiptLineItem"
    ADD CONSTRAINT "PurchaseReceiptLineItem_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
