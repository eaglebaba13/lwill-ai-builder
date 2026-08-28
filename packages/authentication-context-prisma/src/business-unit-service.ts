export interface BusinessUnitRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly slug: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface BusinessUnitCreateInput {
  readonly tenantId: string;
  readonly name: string;
  readonly slug: string;
  readonly isActive?: boolean;
}

export interface BusinessUnitUpdateInput {
  readonly name?: string;
  readonly slug?: string;
  readonly isActive?: boolean;
}

export interface BusinessUnitService {
  createBusinessUnit(input: BusinessUnitCreateInput): Promise<BusinessUnitRecord>;
  getBusinessUnit(args: { tenantId: string; businessUnitId: string }): Promise<BusinessUnitRecord | null>;
  listBusinessUnits(args: { tenantId: string }): Promise<BusinessUnitRecord[]>;
  updateBusinessUnit(args: {
    tenantId: string;
    businessUnitId: string;
    input: BusinessUnitUpdateInput;
  }): Promise<BusinessUnitRecord | null>;
}

interface BusinessUnitPrismaClient {
  readonly businessUnit: {
    create: (args: { data: Record<string, unknown> }) => Promise<BusinessUnitRecord>;
    findUnique: (args: { where: { tenantId_id: { tenantId: string; id: string } } }) => Promise<BusinessUnitRecord | null>;
    findMany: (args: { where: Record<string, unknown> }) => Promise<BusinessUnitRecord[]>;
    update: (args: { data: Record<string, unknown>; where: { tenantId_id: { tenantId: string; id: string } } }) => Promise<BusinessUnitRecord>;
  };
}

export function createBusinessUnitService(prisma: BusinessUnitPrismaClient): BusinessUnitService {
  return {
    async createBusinessUnit(input) {
      return prisma.businessUnit.create({
        data: {
          tenantId: input.tenantId,
          name: input.name,
          slug: input.slug,
          isActive: input.isActive ?? true,
        },
      });
    },
    async getBusinessUnit({ tenantId, businessUnitId }) {
      const businessUnit = await prisma.businessUnit.findUnique({
        where: { tenantId_id: { tenantId, id: businessUnitId } },
      });
      if (businessUnit === null || businessUnit.tenantId !== tenantId) {
        return null;
      }
      return businessUnit;
    },
    async listBusinessUnits({ tenantId }) {
      return prisma.businessUnit.findMany({
        where: { tenantId, isActive: true },
      });
    },
    async updateBusinessUnit({ tenantId, businessUnitId, input }) {
      const existing = await prisma.businessUnit.findUnique({
        where: { tenantId_id: { tenantId, id: businessUnitId } },
      });
      if (existing === null || existing.tenantId !== tenantId) {
        return null;
      }
      const data: Record<string, unknown> = {};
      if (input.name !== undefined) {
        data.name = input.name;
      }
      if (input.slug !== undefined) {
        data.slug = input.slug;
      }
      if (input.isActive !== undefined) {
        data.isActive = input.isActive;
      }
      return prisma.businessUnit.update({
        where: { tenantId_id: { tenantId, id: businessUnitId } },
        data,
      });
    },
  };
}
