export interface MarketplaceAssetRecord {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly type: string;
  readonly category: string | null;
  readonly authorName: string | null;
  readonly iconUrl: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface AssetVersionRecord {
  readonly id: string;
  readonly assetId: string;
  readonly version: string;
  readonly changelog: string | null;
  readonly manifest: Record<string, unknown> | null;
  readonly compatibilityMin: string | null;
  readonly compatibilityMax: string | null;
  readonly isPublished: boolean;
  readonly publishedAt: Date | null;
  readonly createdAt: Date;
}

export interface TenantInstallationRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly assetId: string;
  readonly versionId: string;
  readonly isActive: boolean;
  readonly config: Record<string, unknown> | null;
  readonly installedAt: Date;
  readonly updatedAt: Date;
}

export interface MarketplaceAssetCreateInput {
  readonly name: string;
  readonly slug: string;
  readonly description?: string | null;
  readonly type: string;
  readonly category?: string | null;
  readonly authorName?: string | null;
  readonly iconUrl?: string | null;
}

export interface AssetVersionCreateInput {
  readonly assetId: string;
  readonly version: string;
  readonly changelog?: string | null;
  readonly manifest?: Record<string, unknown> | null;
  readonly compatibilityMin?: string | null;
  readonly compatibilityMax?: string | null;
  readonly isPublished?: boolean;
}

export interface TenantInstallationCreateInput {
  readonly tenantId: string;
  readonly assetId: string;
  readonly versionId: string;
  readonly config?: Record<string, unknown> | null;
  readonly actorUserId?: string | null;
}

export interface MarketplaceService {
  listAssets(args: { type?: string }): Promise<MarketplaceAssetRecord[]>;
  getAsset(args: { assetId: string }): Promise<MarketplaceAssetRecord | null>;
  getAssetBySlug(args: { slug: string }): Promise<MarketplaceAssetRecord | null>;
  createAsset(input: MarketplaceAssetCreateInput): Promise<MarketplaceAssetRecord>;
  listVersions(args: { assetId: string }): Promise<AssetVersionRecord[]>;
  createVersion(input: AssetVersionCreateInput): Promise<AssetVersionRecord>;
  publishVersion(args: { versionId: string }): Promise<AssetVersionRecord | null>;
  listInstallations(args: { tenantId: string }): Promise<TenantInstallationRecord[]>;
  installAsset(input: TenantInstallationCreateInput): Promise<TenantInstallationRecord>;
  uninstallAsset(args: { tenantId: string; assetId: string; actorUserId?: string | null }): Promise<boolean>;
  getInstallation(args: { tenantId: string; assetId: string }): Promise<TenantInstallationRecord | null>;
}

interface MarketplacePrismaClient {
  readonly marketplaceAsset: {
    findMany: (args: { where?: Record<string, unknown>; orderBy?: Record<string, unknown> }) => Promise<MarketplaceAssetRecord[]>;
    findUnique: (args: { where: { id?: string; slug?: string } }) => Promise<MarketplaceAssetRecord | null>;
    create: (args: { data: Record<string, unknown> }) => Promise<MarketplaceAssetRecord>;
  };
  readonly assetVersion: {
    findMany: (args: { where?: Record<string, unknown>; orderBy?: Record<string, unknown> }) => Promise<AssetVersionRecord[]>;
    create: (args: { data: Record<string, unknown> }) => Promise<AssetVersionRecord>;
    update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<AssetVersionRecord>;
    findUnique: (args: { where: { id: string } }) => Promise<AssetVersionRecord | null>;
  };
  readonly tenantInstallation: {
    findMany: (args: { where?: Record<string, unknown> }) => Promise<TenantInstallationRecord[]>;
    findUnique: (args: { where: { tenantId_assetId?: { tenantId: string; assetId: string } } }) => Promise<TenantInstallationRecord | null>;
    create: (args: { data: Record<string, unknown> }) => Promise<TenantInstallationRecord>;
    delete: (args: { where: { tenantId_assetId?: { tenantId: string; assetId: string } } }) => Promise<TenantInstallationRecord>;
  };
  readonly auditLog: {
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  };
}

export function createMarketplaceService(prisma: MarketplacePrismaClient): MarketplaceService {
  return {
    async listAssets({ type } = {}) {
      const where: Record<string, unknown> = { isActive: true };
      if (type) where.type = type;
      return prisma.marketplaceAsset.findMany({ where, orderBy: { name: "asc" } });
    },

    async getAsset({ assetId }) {
      const asset = await prisma.marketplaceAsset.findUnique({ where: { id: assetId } });
      return asset ?? null;
    },

    async getAssetBySlug({ slug }) {
      const asset = await prisma.marketplaceAsset.findUnique({ where: { slug } });
      return asset ?? null;
    },

    async createAsset(input) {
      return prisma.marketplaceAsset.create({
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description ?? null,
          type: input.type,
          category: input.category ?? null,
          authorName: input.authorName ?? null,
          iconUrl: input.iconUrl ?? null,
        },
      });
    },

    async listVersions({ assetId }) {
      return prisma.assetVersion.findMany({
        where: { assetId },
        orderBy: { createdAt: "desc" },
      });
    },

    async createVersion(input) {
      return prisma.assetVersion.create({
        data: {
          assetId: input.assetId,
          version: input.version,
          changelog: input.changelog ?? null,
          manifest: input.manifest ?? null,
          compatibilityMin: input.compatibilityMin ?? null,
          compatibilityMax: input.compatibilityMax ?? null,
          isPublished: input.isPublished ?? false,
        },
      });
    },

    async publishVersion({ versionId }) {
      const version = await prisma.assetVersion.findUnique({ where: { id: versionId } });
      if (version === null || version.isPublished) return version;
      return prisma.assetVersion.update({
        where: { id: versionId },
        data: { isPublished: true, publishedAt: new Date() },
      });
    },

    async listInstallations({ tenantId }) {
      return prisma.tenantInstallation.findMany({ where: { tenantId } });
    },

    async installAsset(input) {
      const installation = await prisma.tenantInstallation.create({
        data: {
          tenantId: input.tenantId,
          assetId: input.assetId,
          versionId: input.versionId,
          config: input.config ?? null,
        },
      });
      await prisma.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorUserId: input.actorUserId ?? null,
          action: "marketplace.install",
          entityType: "MarketplaceAsset",
          entityId: input.assetId,
          metadata: { versionId: input.versionId, installationId: installation.id },
        },
      });
      return installation;
    },

    async uninstallAsset({ tenantId, assetId, actorUserId }) {
      const existing = await prisma.tenantInstallation.findUnique({
        where: { tenantId_assetId: { tenantId, assetId } },
      });
      if (existing === null) return false;
      await prisma.tenantInstallation.delete({
        where: { tenantId_assetId: { tenantId, assetId } },
      });
      await prisma.auditLog.create({
        data: {
          tenantId,
          actorUserId: actorUserId ?? null,
          action: "marketplace.uninstall",
          entityType: "MarketplaceAsset",
          entityId: assetId,
          metadata: { versionId: existing.versionId },
        },
      });
      return true;
    },

    async getInstallation({ tenantId, assetId }) {
      const installation = await prisma.tenantInstallation.findUnique({
        where: { tenantId_assetId: { tenantId, assetId } },
      });
      return installation ?? null;
    },
  };
}
