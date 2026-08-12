-- CreateTable
CREATE TABLE "Invoice" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "subtotalCents" INTEGER NOT NULL,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "gstCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLineItem" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "serviceId" UUID,
    "packageId" UUID,
    "quantity" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "lineTotalCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_tenantId_id_key" ON "Invoice"("tenantId", "id");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_issuedAt_idx" ON "Invoice"("tenantId", "issuedAt");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_customerId_idx" ON "Invoice"("tenantId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceLineItem_tenantId_id_key" ON "InvoiceLineItem"("tenantId", "id");

-- CreateIndex
CREATE INDEX "InvoiceLineItem_tenantId_invoiceId_idx" ON "InvoiceLineItem"("tenantId", "invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceLineItem_tenantId_serviceId_idx" ON "InvoiceLineItem"("tenantId", "serviceId");

-- CreateIndex
CREATE INDEX "InvoiceLineItem_tenantId_packageId_idx" ON "InvoiceLineItem"("tenantId", "packageId");

-- AddForeignKey
ALTER TABLE "Invoice"
    ADD CONSTRAINT "Invoice_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice"
    ADD CONSTRAINT "Invoice_tenantId_customerId_fkey"
    FOREIGN KEY ("tenantId", "customerId") REFERENCES "Customer"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLineItem"
    ADD CONSTRAINT "InvoiceLineItem_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLineItem"
    ADD CONSTRAINT "InvoiceLineItem_tenantId_invoiceId_fkey"
    FOREIGN KEY ("tenantId", "invoiceId") REFERENCES "Invoice"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLineItem"
    ADD CONSTRAINT "InvoiceLineItem_tenantId_serviceId_fkey"
    FOREIGN KEY ("tenantId", "serviceId") REFERENCES "Service"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLineItem"
    ADD CONSTRAINT "InvoiceLineItem_tenantId_packageId_fkey"
    FOREIGN KEY ("tenantId", "packageId") REFERENCES "Package"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
