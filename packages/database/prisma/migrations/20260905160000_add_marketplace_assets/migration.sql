-- CreateTable
CREATE TABLE "MarketplaceAsset" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "authorName" TEXT,
    "iconUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetVersion" (
    "id" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "changelog" TEXT,
    "manifest" JSONB,
    "compatibilityMin" TEXT,
    "compatibilityMax" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantInstallation" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantInstallation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceAsset_slug_key" ON "MarketplaceAsset"("slug");

-- CreateIndex
CREATE INDEX "MarketplaceAsset_type_idx" ON "MarketplaceAsset"("type");

-- CreateIndex
CREATE INDEX "MarketplaceAsset_isActive_idx" ON "MarketplaceAsset"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AssetVersion_assetId_version_key" ON "AssetVersion"("assetId", "version");

-- CreateIndex
CREATE INDEX "AssetVersion_assetId_idx" ON "AssetVersion"("assetId");

-- CreateIndex
CREATE INDEX "AssetVersion_isPublished_idx" ON "AssetVersion"("isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "TenantInstallation_tenantId_assetId_key" ON "TenantInstallation"("tenantId", "assetId");

-- CreateIndex
CREATE INDEX "TenantInstallation_tenantId_idx" ON "TenantInstallation"("tenantId");

-- CreateIndex
CREATE INDEX "TenantInstallation_assetId_idx" ON "TenantInstallation"("assetId");

-- AddForeignKey
ALTER TABLE "AssetVersion" ADD CONSTRAINT "AssetVersion_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MarketplaceAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantInstallation" ADD CONSTRAINT "TenantInstallation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantInstallation" ADD CONSTRAINT "TenantInstallation_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MarketplaceAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantInstallation" ADD CONSTRAINT "TenantInstallation_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "AssetVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
