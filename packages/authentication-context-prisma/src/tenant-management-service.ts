export interface TenantRecord {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface TenantDetailRecord extends TenantRecord {
  readonly domains: ReadonlyArray<{
    readonly id: string;
    readonly domain: string;
    readonly isPrimary: boolean;
    readonly verificationStatus: string;
    readonly isActive: boolean;
  }>;
  readonly _count: {
    readonly businessUnits: number;
    readonly branches: number;
    readonly users: number;
  };
}

export interface TenantCreateInput {
  readonly name: string;
  readonly slug: string;
}

export interface TenantUpdateInput {
  readonly name?: string;
  readonly isActive?: boolean;
}

export interface TenantService {
  listTenants(): Promise<readonly TenantRecord[]>;
  getTenant(args: { tenantId: string }): Promise<TenantDetailRecord | null>;
  createTenant(input: TenantCreateInput): Promise<TenantRecord>;
  updateTenant(args: { tenantId: string; input: TenantUpdateInput }): Promise<TenantRecord | null>;
}

interface TenantPrismaClient {
  readonly tenant: {
    create(args: { data: Record<string, unknown> }): Promise<TenantRecord>;
    findUnique(args: { where: { id: string }; include?: Record<string, unknown> }): Promise<TenantDetailRecord | null>;
    findMany(args: { where?: Record<string, unknown>; orderBy?: Record<string, unknown> }): Promise<readonly TenantRecord[]>;
    update(args: { data: Record<string, unknown>; where: { id: string } }): Promise<TenantRecord>;
    count(args: { where?: Record<string, unknown> }): Promise<number>;
  };
  readonly tenantDomain: {
    count(args: { where?: Record<string, unknown> }): Promise<number>;
  };
  readonly businessUnit: {
    count(args: { where?: Record<string, unknown> }): Promise<number>;
  };
  readonly branch: {
    count(args: { where?: Record<string, unknown> }): Promise<number>;
  };
  readonly tenantMembership: {
    count(args: { where?: Record<string, unknown> }): Promise<number>;
  };
}

export function createTenantService(prisma: TenantPrismaClient): TenantService {
  return {
    async listTenants() {
      return prisma.tenant.findMany({
        orderBy: { createdAt: "desc" },
      });
    },

    async getTenant({ tenantId }) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
          tenantDomains: {
            select: {
              id: true,
              domain: true,
              isPrimary: true,
              verificationStatus: true,
              isActive: true,
            },
          },
        },
      });
      if (tenant === null) {
        return null;
      }

      const [businessUnitCount, branchCount, userCount] = await Promise.all([
        prisma.businessUnit.count({ where: { tenantId } }),
        prisma.branch.count({ where: { tenantId } }),
        prisma.tenantMembership.count({ where: { tenantId } }),
      ]);

      return {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        isActive: tenant.isActive,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
        domains: (tenant as unknown as { tenantDomains: TenantDetailRecord["domains"] }).tenantDomains ?? [],
        _count: {
          businessUnits: businessUnitCount,
          branches: branchCount,
          users: userCount,
        },
      };
    },

    async createTenant(input) {
      return prisma.tenant.create({
        data: {
          name: input.name,
          slug: input.slug,
          isActive: true,
        },
      });
    },

    async updateTenant({ tenantId, input }) {
      const existing = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (existing === null) {
        return null;
      }
      const data: Record<string, unknown> = {};
      if (input.name !== undefined) {
        data.name = input.name;
      }
      if (input.isActive !== undefined) {
        data.isActive = input.isActive;
      }
      return prisma.tenant.update({ where: { id: tenantId }, data });
    },
  };
}
