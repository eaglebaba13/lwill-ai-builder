-- CreateTable
CREATE TABLE "Pipeline" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pipeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "pipelineId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "pipelineId" UUID NOT NULL,
    "stageId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "customerId" UUID,
    "leadId" UUID,
    "valueCents" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pipeline_tenantId_id_key" ON "Pipeline"("tenantId", "id");

-- CreateIndex
CREATE INDEX "Pipeline_tenantId_isActive_idx" ON "Pipeline"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Stage_tenantId_id_key" ON "Stage"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Stage_tenantId_pipelineId_position_key" ON "Stage"("tenantId", "pipelineId", "position");

-- CreateIndex
CREATE INDEX "Stage_tenantId_pipelineId_idx" ON "Stage"("tenantId", "pipelineId");

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_tenantId_id_key" ON "Opportunity"("tenantId", "id");

-- CreateIndex
CREATE INDEX "Opportunity_tenantId_status_idx" ON "Opportunity"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Opportunity_tenantId_pipelineId_idx" ON "Opportunity"("tenantId", "pipelineId");

-- CreateIndex
CREATE INDEX "Opportunity_tenantId_stageId_idx" ON "Opportunity"("tenantId", "stageId");

-- AddForeignKey
ALTER TABLE "Pipeline" ADD CONSTRAINT "Pipeline_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stage" ADD CONSTRAINT "Stage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stage" ADD CONSTRAINT "Stage_tenantId_pipelineId_fkey" FOREIGN KEY ("tenantId", "pipelineId") REFERENCES "Pipeline"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_tenantId_pipelineId_fkey" FOREIGN KEY ("tenantId", "pipelineId") REFERENCES "Pipeline"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_tenantId_stageId_fkey" FOREIGN KEY ("tenantId", "stageId") REFERENCES "Stage"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
