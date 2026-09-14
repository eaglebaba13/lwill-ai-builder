-- CreateTable
CREATE TABLE "FranchiseSettlement" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "agreementId" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CALCULATED',
    "grossSalesCents" INTEGER NOT NULL DEFAULT 0,
    "gstCents" INTEGER NOT NULL DEFAULT 0,
    "netSalesCents" INTEGER NOT NULL DEFAULT 0,
    "mgCents" INTEGER NOT NULL DEFAULT 0,
    "variableReturnCents" INTEGER NOT NULL DEFAULT 0,
    "payoutCents" INTEGER NOT NULL DEFAULT 0,
    "royaltyCents" INTEGER NOT NULL DEFAULT 0,
    "adjustmentCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "termsSnapshot" JSONB,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FranchiseSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FranchiseSettlementLine" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "settlementId" UUID NOT NULL,
    "lineType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FranchiseSettlementLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FranchisePayment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "settlementId" UUID NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reference" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FranchisePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FranchiseSettlement_tenantId_id_key" ON "FranchiseSettlement"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "FranchiseSettlement_tenantId_agreementId_periodStart_periodEn_key" ON "FranchiseSettlement"("tenantId", "agreementId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "FranchiseSettlement_tenantId_partnerId_idx" ON "FranchiseSettlement"("tenantId", "partnerId");

-- CreateIndex
CREATE INDEX "FranchiseSettlement_tenantId_status_idx" ON "FranchiseSettlement"("tenantId", "status");

-- CreateIndex
CREATE INDEX "FranchiseSettlement_tenantId_periodStart_idx" ON "FranchiseSettlement"("tenantId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "FranchiseSettlementLine_tenantId_id_key" ON "FranchiseSettlementLine"("tenantId", "id");

-- CreateIndex
CREATE INDEX "FranchiseSettlementLine_tenantId_settlementId_idx" ON "FranchiseSettlementLine"("tenantId", "settlementId");

-- CreateIndex
CREATE INDEX "FranchiseSettlementLine_tenantId_lineType_idx" ON "FranchiseSettlementLine"("tenantId", "lineType");

-- CreateIndex
CREATE UNIQUE INDEX "FranchisePayment_tenantId_id_key" ON "FranchisePayment"("tenantId", "id");

-- CreateIndex
CREATE INDEX "FranchisePayment_tenantId_settlementId_idx" ON "FranchisePayment"("tenantId", "settlementId");

-- CreateIndex
CREATE INDEX "FranchisePayment_tenantId_status_idx" ON "FranchisePayment"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "FranchiseSettlement" ADD CONSTRAINT "FranchiseSettlement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FranchiseSettlement" ADD CONSTRAINT "FranchiseSettlement_tenantId_agreementId_fkey" FOREIGN KEY ("tenantId", "agreementId") REFERENCES "FranchiseAgreement"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FranchiseSettlement" ADD CONSTRAINT "FranchiseSettlement_tenantId_partnerId_fkey" FOREIGN KEY ("tenantId", "partnerId") REFERENCES "FranchisePartner"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FranchiseSettlementLine" ADD CONSTRAINT "FranchiseSettlementLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FranchiseSettlementLine" ADD CONSTRAINT "FranchiseSettlementLine_tenantId_settlementId_fkey" FOREIGN KEY ("tenantId", "settlementId") REFERENCES "FranchiseSettlement"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FranchisePayment" ADD CONSTRAINT "FranchisePayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FranchisePayment" ADD CONSTRAINT "FranchisePayment_tenantId_settlementId_fkey" FOREIGN KEY ("tenantId", "settlementId") REFERENCES "FranchiseSettlement"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
