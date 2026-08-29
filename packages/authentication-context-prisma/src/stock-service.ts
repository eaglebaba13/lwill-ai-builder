export interface StockItemRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly productId: string;
  readonly branchId: string;
  readonly quantity: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface StockMovementRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly productId: string;
  readonly branchId: string;
  readonly movementType: string;
  readonly quantity: number;
  readonly referenceType: string | null;
  readonly referenceId: string | null;
  readonly notes: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface StockItemCreateInput {
  readonly tenantId: string;
  readonly productId: string;
  readonly branchId: string;
  readonly quantity?: number;
}

export interface StockItemUpdateInput {
  readonly quantity?: number;
}

export interface StockMovementCreateInput {
  readonly tenantId: string;
  readonly productId: string;
  readonly branchId: string;
  readonly movementType: string;
  readonly quantity: number;
  readonly referenceType?: string | null;
  readonly referenceId?: string | null;
  readonly notes?: string | null;
}

export interface StockService {
  getStockItem(args: { tenantId: string; productId: string; branchId: string }): Promise<StockItemRecord | null>;
  getStockItemById(args: { tenantId: string; stockItemId: string }): Promise<StockItemRecord | null>;
  listStockItems(args: { tenantId: string; branchId?: string }): Promise<StockItemRecord[]>;
  listStockMovements(args: { tenantId: string }): Promise<StockMovementRecord[]>;
  getStockMovement(args: { tenantId: string; stockMovementId: string }): Promise<StockMovementRecord | null>;
  createStockItem(input: StockItemCreateInput): Promise<StockItemRecord>;
  updateStockItem(args: { tenantId: string; stockItemId: string; input: StockItemUpdateInput }): Promise<StockItemRecord | null>;
  createStockMovement(input: {
    tenantId: string;
    productId: string;
    branchId: string;
    movementType: string;
    quantity: number;
    referenceType?: string | null;
    referenceId?: string | null;
    notes?: string | null;
  }): Promise<StockMovementRecord>;
  recordStockMovement(input: StockMovementCreateInput): Promise<StockItemRecord>;
  deductStock(args: {
    tenantId: string;
    productId: string;
    branchId: string;
    quantity: number;
    referenceType: string;
    referenceId: string;
    notes?: string | null;
  }): Promise<StockItemRecord>;
}

interface StockPrismaClient {
  readonly stockItem: {
    findUnique: (args: { where: { id: string } }) => Promise<StockItemRecord | null>;
    findFirst: (args: { where: Record<string, unknown> }) => Promise<StockItemRecord | null>;
    findMany: (args: { where?: Record<string, unknown> }) => Promise<StockItemRecord[]>;
    create: (args: { data: Record<string, unknown> }) => Promise<StockItemRecord>;
    update: (args: { data: Record<string, unknown>; where: { id: string } }) => Promise<StockItemRecord>;
  };
  readonly stockMovement: {
    create: (args: { data: Record<string, unknown> }) => Promise<StockMovementRecord>;
    findMany: (args: { where?: Record<string, unknown> }) => Promise<StockMovementRecord[]>;
    findUnique: (args: { where: { id: string } }) => Promise<StockMovementRecord | null>;
  };
  readonly product: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string; tenantId: string } | null>;
  };
  readonly branch: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string; tenantId: string } | null>;
  };
  $transaction: {
    <T>(callback: (client: StockPrismaClient) => Promise<T>): Promise<T>;
  };
}

export function createStockService(prisma: StockPrismaClient): StockService {
  return {
    async getStockItem({ tenantId, productId, branchId }) {
      const stockItem = await prisma.stockItem.findFirst({
        where: { tenantId, productId, branchId },
      });
      if (stockItem === null) {
        return null;
      }
      return stockItem;
    },

    async listStockItems({ tenantId, branchId }) {
      const where: Record<string, unknown> = { tenantId };
      if (branchId !== undefined) {
        where.branchId = branchId;
      }
      return prisma.stockItem.findMany({ where });
    },

    async getStockItemById({ tenantId, stockItemId }) {
      const stockItem = await prisma.stockItem.findUnique({ where: { id: stockItemId } });
      if (stockItem === null || stockItem.tenantId !== tenantId) {
        return null;
      }
      return stockItem;
    },

    async listStockMovements({ tenantId }) {
      return prisma.stockMovement.findMany({ where: { tenantId } });
    },

    async getStockMovement({ tenantId, stockMovementId }) {
      const movement = await prisma.stockMovement.findUnique({ where: { id: stockMovementId } });
      if (movement === null || movement.tenantId !== tenantId) {
        return null;
      }
      return movement;
    },

    async createStockItem(input) {
      const product = await prisma.product.findUnique({ where: { id: input.productId } });
      if (product === null || product.tenantId !== input.tenantId) {
        throw new Error("product must belong to the same tenant");
      }

      const branch = await prisma.branch.findUnique({ where: { id: input.branchId } });
      if (branch === null || branch.tenantId !== input.tenantId) {
        throw new Error("branch must belong to the same tenant");
      }

      const existing = await prisma.stockItem.findFirst({
        where: { tenantId: input.tenantId, productId: input.productId, branchId: input.branchId },
      });
      if (existing !== null) {
        throw new Error("stock item already exists for this product and branch");
      }

      return prisma.stockItem.create({
        data: {
          tenantId: input.tenantId,
          productId: input.productId,
          branchId: input.branchId,
          quantity: input.quantity ?? 0,
        },
      });
    },

    async updateStockItem({ tenantId, stockItemId, input }) {
      const existing = await prisma.stockItem.findUnique({ where: { id: stockItemId } });
      if (existing === null || existing.tenantId !== tenantId) {
        return null;
      }

      const data: Record<string, unknown> = {};
      if (input.quantity !== undefined) {
        data.quantity = input.quantity;
      }

      return prisma.stockItem.update({ where: { id: stockItemId }, data });
    },

    async recordStockMovement(input) {
      const product = await prisma.product.findUnique({ where: { id: input.productId } });
      if (product === null || product.tenantId !== input.tenantId) {
        throw new Error("product must belong to the same tenant");
      }

      const branch = await prisma.branch.findUnique({ where: { id: input.branchId } });
      if (branch === null || branch.tenantId !== input.tenantId) {
        throw new Error("branch must belong to the same tenant");
      }

      return prisma.$transaction(async (transaction) => {
        let stockItem = await transaction.stockItem.findFirst({
          where: { tenantId: input.tenantId, productId: input.productId, branchId: input.branchId },
        });

        if (stockItem === null) {
          stockItem = await transaction.stockItem.create({
            data: {
              tenantId: input.tenantId,
              productId: input.productId,
              branchId: input.branchId,
              quantity: 0,
            },
          });
        }

        const updated = await transaction.stockItem.update({
          where: { id: stockItem.id },
          data: { quantity: { increment: input.quantity } },
        });

        await transaction.stockMovement.create({
          data: {
            tenantId: input.tenantId,
            productId: input.productId,
            branchId: input.branchId,
            movementType: input.movementType,
            quantity: input.quantity,
            referenceType: input.referenceType ?? null,
            referenceId: input.referenceId ?? null,
            notes: input.notes ?? null,
          },
        });

        return updated;
      });
    },

    async createStockMovement(input) {
      return prisma.stockMovement.create({
        data: {
          tenantId: input.tenantId,
          productId: input.productId,
          branchId: input.branchId,
          movementType: input.movementType,
          quantity: input.quantity,
          referenceType: input.referenceType ?? null,
          referenceId: input.referenceId ?? null,
          notes: input.notes ?? null,
        },
      });
    },

    async deductStock({ tenantId, productId, branchId, quantity, referenceType, referenceId, notes }) {
      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (product === null || product.tenantId !== tenantId) {
        throw new Error("product must belong to the same tenant");
      }

      const branch = await prisma.branch.findUnique({ where: { id: branchId } });
      if (branch === null || branch.tenantId !== tenantId) {
        throw new Error("branch must belong to the same tenant");
      }

      let stockItem = await prisma.stockItem.findFirst({
        where: { tenantId, productId, branchId },
      });

      if (stockItem === null) {
        stockItem = await prisma.stockItem.create({
          data: {
            tenantId,
            productId,
            branchId,
            quantity: 0,
          },
        });
      }

      const updated = await prisma.stockItem.update({
        where: { id: stockItem.id },
        data: { quantity: { decrement: quantity } },
      });

      await prisma.stockMovement.create({
        data: {
          tenantId,
          productId,
          branchId,
          movementType: "SALE",
          quantity: -quantity,
          referenceType: referenceType,
          referenceId: referenceId,
          notes: notes ?? `Stock deducted for ${referenceType} ${referenceId}`,
        },
      });

      return updated;
    },
  };
}
