-- CreateTable
CREATE TABLE "Communication" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "channel" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "contactName" TEXT,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "communicatedAt" TIMESTAMP(3) NOT NULL,
    "leadId" UUID,
    "customerId" UUID,
    "opportunityId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Communication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Communication_tenantId_id_key" ON "Communication"("tenantId", "id");

-- CreateIndex
CREATE INDEX "Communication_tenantId_channel_idx" ON "Communication"("tenantId", "channel");

-- CreateIndex
CREATE INDEX "Communication_tenantId_direction_idx" ON "Communication"("tenantId", "direction");

-- CreateIndex
CREATE INDEX "Communication_tenantId_communicatedAt_idx" ON "Communication"("tenantId", "communicatedAt");

-- CreateIndex
CREATE INDEX "Communication_tenantId_leadId_idx" ON "Communication"("tenantId", "leadId");

-- CreateIndex
CREATE INDEX "Communication_tenantId_customerId_idx" ON "Communication"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "Communication_tenantId_opportunityId_idx" ON "Communication"("tenantId", "opportunityId");

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
