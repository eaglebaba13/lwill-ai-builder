-- CreateTable
CREATE TABLE "TenantDomain" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "domain" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantDomain_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantDomain_domain_key" ON "TenantDomain"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "TenantDomain_tenantId_domain_key" ON "TenantDomain"("tenantId", "domain");

-- CreateIndex
CREATE INDEX "TenantDomain_tenantId_isActive_idx" ON "TenantDomain"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "TenantDomain_domain_isActive_idx" ON "TenantDomain"("domain", "isActive");

-- CreateIndex
CREATE INDEX "TenantDomain_isActive_verificationStatus_idx" ON "TenantDomain"("isActive", "verificationStatus");

-- AddForeignKey
ALTER TABLE "TenantDomain"
    ADD CONSTRAINT "TenantDomain_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
