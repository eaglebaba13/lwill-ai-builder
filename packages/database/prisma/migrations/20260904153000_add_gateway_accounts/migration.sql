-- CreateTable
CREATE TABLE "GatewayAccount" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "label" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL,

    CONSTRAINT "GatewayAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GatewayAccount_tenantId_id_key" ON "GatewayAccount"("tenantId", "id");

-- CreateIndex
CREATE INDEX "GatewayAccount_tenantId_provider_idx" ON "GatewayAccount"("tenantId", "provider");

-- CreateIndex
CREATE INDEX "GatewayAccount_tenantId_isActive_idx" ON "GatewayAccount"("tenantId", "isActive");

-- AddForeignKey
ALTER TABLE "GatewayAccount" ADD CONSTRAINT "GatewayAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
