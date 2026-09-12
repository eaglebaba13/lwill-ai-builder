-- CreateTable
CREATE TABLE "Followup" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "leadId" UUID,
    "customerId" UUID,
    "opportunityId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Followup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Followup_tenantId_id_key" ON "Followup"("tenantId", "id");

-- CreateIndex
CREATE INDEX "Followup_tenantId_status_idx" ON "Followup"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Followup_tenantId_dueAt_idx" ON "Followup"("tenantId", "dueAt");

-- CreateIndex
CREATE INDEX "Followup_tenantId_leadId_idx" ON "Followup"("tenantId", "leadId");

-- CreateIndex
CREATE INDEX "Followup_tenantId_customerId_idx" ON "Followup"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "Followup_tenantId_opportunityId_idx" ON "Followup"("tenantId", "opportunityId");

-- AddForeignKey
ALTER TABLE "Followup" ADD CONSTRAINT "Followup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Followup" ADD CONSTRAINT "Followup_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Followup" ADD CONSTRAINT "Followup_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Followup" ADD CONSTRAINT "Followup_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
