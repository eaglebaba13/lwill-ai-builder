export interface ReorderRuleRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly productId: string;
  readonly branchId: string;
  readonly warehouseId: string;
  readonly minQuantity: number;
  readonly reorderQuantity: number;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ReorderRuleCreateInput {
  readonly tenantId: string;
  readonly productId: string;
  readonly branchId: string;
  readonly warehouseId: string;
  readonly minQuantity: number;
  readonly reorderQuantity: number;
  readonly isActive?: boolean;
}

export interface ReorderRuleUpdateInput {
  readonly minQuantity?: number;
  readonly reorderQuantity?: number;
  readonly isActive?: boolean;
}

export interface ReorderRuleService {
  createReorderRule(input: ReorderRuleCreateInput): Promise<ReorderRuleRecord>;
  getReorderRule(args: { tenantId: string; reorderRuleId: string }): Promise<ReorderRuleRecord | null>;
  listReorderRules(args: { tenantId: string }): Promise<ReorderRuleRecord[]>;
  updateReorderRule(args: {
    tenantId: string;
    reorderRuleId: string;
    input: ReorderRuleUpdateInput;
  }): Promise<ReorderRuleRecord | null>;
}

interface ReorderRulePrismaClient {
  readonly reorderRule: {
    create: (args: { data: Record<string, unknown> }) => Promise<ReorderRuleRecord>;
    findUnique: (args: { where: { id: string } }) => Promise<ReorderRuleRecord | null>;
    findMany: (args: { where?: Record<string, unknown> }) => Promise<ReorderRuleRecord[]>;
    update: (args: { data: Record<string, unknown>; where: { id: string } }) => Promise<ReorderRuleRecord>;
  };
  readonly product: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string; tenantId: string } | null>;
  };
  readonly branch: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string; tenantId: string } | null>;
  };
  readonly warehouse: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string; tenantId: string } | null>;
  };
}

export function createReorderRuleService(prisma: ReorderRulePrismaClient): ReorderRuleService {
  return {
    async createReorderRule(input) {
      const product = await prisma.product.findUnique({ where: { id: input.productId } });
      if (product === null || product.tenantId !== input.tenantId) {
        throw new Error("product must belong to the same tenant");
      }

      const branch = await prisma.branch.findUnique({ where: { id: input.branchId } });
      if (branch === null || branch.tenantId !== input.tenantId) {
        throw new Error("branch must belong to the same tenant");
      }

      const warehouse = await prisma.warehouse.findUnique({ where: { id: input.warehouseId } });
      if (warehouse === null || warehouse.tenantId !== input.tenantId) {
        throw new Error("warehouse must belong to the same tenant");
      }

      if (input.minQuantity < 0 || input.reorderQuantity <= 0) {
        throw new Error("minQuantity must be non-negative and reorderQuantity must be positive");
      }

      return prisma.reorderRule.create({
        data: {
          tenantId: input.tenantId,
          productId: input.productId,
          branchId: input.branchId,
          warehouseId: input.warehouseId,
          minQuantity: input.minQuantity,
          reorderQuantity: input.reorderQuantity,
          isActive: input.isActive ?? true,
        },
      });
    },
    async getReorderRule({ tenantId, reorderRuleId }) {
      const rule = await prisma.reorderRule.findUnique({ where: { id: reorderRuleId } });
      if (rule === null || rule.tenantId !== tenantId) {
        return null;
      }
      return rule;
    },
    async listReorderRules({ tenantId }) {
      return prisma.reorderRule.findMany({
        where: { tenantId, isActive: true },
      });
    },
    async updateReorderRule({ tenantId, reorderRuleId, input }) {
      const existing = await prisma.reorderRule.findUnique({ where: { id: reorderRuleId } });
      if (existing === null || existing.tenantId !== tenantId) {
        return null;
      }

      const data: Record<string, unknown> = {};
      if (input.minQuantity !== undefined) {
        if (input.minQuantity < 0) {
          throw new Error("minQuantity must be non-negative");
        }
        data.minQuantity = input.minQuantity;
      }
      if (input.reorderQuantity !== undefined) {
        if (input.reorderQuantity <= 0) {
          throw new Error("reorderQuantity must be positive");
        }
        data.reorderQuantity = input.reorderQuantity;
      }
      if (input.isActive !== undefined) {
        data.isActive = input.isActive;
      }

      return prisma.reorderRule.update({ where: { id: reorderRuleId }, data });
    },
  };
}
