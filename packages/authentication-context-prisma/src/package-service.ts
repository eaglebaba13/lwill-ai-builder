export interface PackageRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly serviceIds: string[];
  readonly priceCents: number | null;
  readonly durationDays: number | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface PackageCreateInput {
  readonly tenantId: string;
  readonly name: string;
  readonly serviceIds: string[];
  readonly priceCents?: number | null;
  readonly durationDays?: number | null;
  readonly isActive?: boolean;
}

export interface PackageUpdateInput {
  readonly name?: string;
  readonly serviceIds?: string[];
  readonly priceCents?: number | null;
  readonly durationDays?: number | null;
  readonly isActive?: boolean;
}

export interface PackageService {
  createPackage(input: PackageCreateInput): Promise<PackageRecord>;
  getPackage(args: { tenantId: string; packageId: string }): Promise<PackageRecord | null>;
  listPackages(args: { tenantId: string }): Promise<PackageRecord[]>;
  updatePackage(args: {
    tenantId: string;
    packageId: string;
    input: PackageUpdateInput;
  }): Promise<PackageRecord | null>;
}

interface PackagePrismaClient {
  readonly package: {
    create: (args: { data: Record<string, unknown> }) => Promise<PackageRecord>;
    findUnique: (args: { where: { id: string } }) => Promise<PackageRecord | null>;
    findMany: (args: { where?: Record<string, unknown> }) => Promise<PackageRecord[]>;
    update: (args: { data: Record<string, unknown>; where: { id: string } }) => Promise<PackageRecord>;
  };
  readonly service: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string; tenantId: string } | null>;
  };
}

export function createPackageService(prisma: PackagePrismaClient): PackageService {
  return {
    async createPackage(input) {
      for (const serviceId of input.serviceIds) {
        const service = await prisma.service.findUnique({ where: { id: serviceId } });
        if (service === null || service.tenantId !== input.tenantId) {
          throw new Error("service must belong to the same tenant");
        }
      }

      return prisma.package.create({
        data: {
          tenantId: input.tenantId,
          name: input.name,
          serviceIds: input.serviceIds,
          priceCents: input.priceCents ?? null,
          durationDays: input.durationDays ?? null,
          isActive: input.isActive ?? true,
        },
      });
    },
    async getPackage({ tenantId, packageId }) {
      const pkg = await prisma.package.findUnique({ where: { id: packageId } });
      if (pkg === null || pkg.tenantId !== tenantId) {
        return null;
      }
      return pkg;
    },
    async listPackages({ tenantId }) {
      return prisma.package.findMany({ where: { tenantId } });
    },
    async updatePackage({ tenantId, packageId, input }) {
      const existing = await prisma.package.findUnique({ where: { id: packageId } });
      if (existing === null || existing.tenantId !== tenantId) {
        return null;
      }
      const data: Record<string, unknown> = {};
      if (input.name !== undefined) {
        data.name = input.name;
      }
      if (input.serviceIds !== undefined) {
        for (const serviceId of input.serviceIds) {
          const service = await prisma.service.findUnique({ where: { id: serviceId } });
          if (service === null || service.tenantId !== tenantId) {
            throw new Error("service must belong to the same tenant");
          }
        }
        data.serviceIds = input.serviceIds;
      }
      if (input.priceCents !== undefined) {
        data.priceCents = input.priceCents;
      }
      if (input.durationDays !== undefined) {
        data.durationDays = input.durationDays;
      }
      if (input.isActive !== undefined) {
        data.isActive = input.isActive;
      }
      return prisma.package.update({ where: { id: packageId }, data });
    },
  };
}
