export interface BranchRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly businessUnitId: string;
  readonly name: string;
  readonly slug: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface BranchCreateInput {
  readonly tenantId: string;
  readonly businessUnitId: string;
  readonly name: string;
  readonly slug: string;
  readonly isActive?: boolean;
}

export interface BranchUpdateInput {
  readonly businessUnitId?: string;
  readonly name?: string;
  readonly slug?: string;
  readonly isActive?: boolean;
}

export interface BranchService {
  createBranch(input: BranchCreateInput): Promise<BranchRecord>;
  getBranch(args: { tenantId: string; branchId: string }): Promise<BranchRecord | null>;
  listBranches(args: { tenantId: string }): Promise<BranchRecord[]>;
  updateBranch(args: {
    tenantId: string;
    branchId: string;
    input: BranchUpdateInput;
  }): Promise<BranchRecord | null>;
}

interface BranchPrismaClient {
  readonly branch: {
    create: (args: { data: Record<string, unknown> }) => Promise<BranchRecord>;
    findUnique: (args: { where: { id: string } }) => Promise<BranchRecord | null>;
    findMany: (args: { where: Record<string, unknown> }) => Promise<BranchRecord[]>;
    update: (args: { data: Record<string, unknown>; where: { id: string } }) => Promise<BranchRecord>;
  };
  readonly businessUnit: {
    findUnique: (args: { where: { tenantId_id: { tenantId: string; id: string } } }) => Promise<{ id: string; tenantId: string } | null>;
  };
}

export function createBranchService(prisma: BranchPrismaClient): BranchService {
  return {
    async createBranch(input) {
      const businessUnit = await prisma.businessUnit.findUnique({
        where: { tenantId_id: { tenantId: input.tenantId, id: input.businessUnitId } },
      });
      if (businessUnit === null || businessUnit.tenantId !== input.tenantId) {
        throw new Error("business unit must belong to the same tenant");
      }

      return prisma.branch.create({
        data: {
          tenantId: input.tenantId,
          businessUnitId: input.businessUnitId,
          name: input.name,
          slug: input.slug,
          isActive: input.isActive ?? true,
        },
      });
    },
    async getBranch({ tenantId, branchId }) {
      const branch = await prisma.branch.findUnique({ where: { id: branchId } });
      if (branch === null || branch.tenantId !== tenantId) {
        return null;
      }
      return branch;
    },
    async listBranches({ tenantId }) {
      return prisma.branch.findMany({
        where: { tenantId, isActive: true },
      });
    },
    async updateBranch({ tenantId, branchId, input }) {
      const existing = await prisma.branch.findUnique({ where: { id: branchId } });
      if (existing === null || existing.tenantId !== tenantId) {
        return null;
      }
      const data: Record<string, unknown> = {};
      if (input.businessUnitId !== undefined) {
        const businessUnit = await prisma.businessUnit.findUnique({
          where: { tenantId_id: { tenantId, id: input.businessUnitId } },
        });
        if (businessUnit === null || businessUnit.tenantId !== tenantId) {
          throw new Error("business unit must belong to the same tenant");
        }
        data.businessUnitId = input.businessUnitId;
      }
      if (input.name !== undefined) {
        data.name = input.name;
      }
      if (input.slug !== undefined) {
        data.slug = input.slug;
      }
      if (input.isActive !== undefined) {
        data.isActive = input.isActive;
      }
      return prisma.branch.update({ where: { id: branchId }, data });
    },
  };
}
