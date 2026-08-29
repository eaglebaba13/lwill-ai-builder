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
  readonly adjustmentDirection?: "IN" | "OUT" | null;
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
  recordStockMovement(input: StockMovementCreateInput, transactionClient?: StockPrismaClient): Promise<StockItemRecord>;
  listLowStockItems(tenantId: string): Promise<ReadonlyArray<{
    readonly stockItemId: string;
    readonly productId: string;
    readonly branchId: string;
    readonly quantity: number;
    readonly minQuantity: number;
    readonly reorderQuantity: number;
  }>>;
}

export interface StockPrismaClient {
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
  readonly reorderRule: {
    findMany: (args: { where?: Record<string, unknown>; select?: Record<string, unknown> }) => Promise<ReadonlyArray<{
      readonly productId: string;
      readonly branchId: string;
      readonly minQuantity: number;
      readonly reorderQuantity: number;
    }>>;
  };
  $transaction: {
    <T>(callback: (client: StockPrismaClient) => Promise<T>): Promise<T>;
  };
}

const APPROVED_MOVEMENT_TYPES = new Set(["PURCHASE", "SALE", "ADJUSTMENT"]);

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

    async recordStockMovement(input, transactionClient?: StockPrismaClient) {
      if (!APPROVED_MOVEMENT_TYPES.has(input.movementType)) {
        throw new Error("unsupported movement type");
      }

      const run = async (db: StockPrismaClient): Promise<StockItemRecord> => {
        const product = await db.product.findUnique({ where: { id: input.productId } });
        if (product === null || product.tenantId !== input.tenantId) {
          throw new Error("product must belong to the same tenant");
        }

        const branch = await db.branch.findUnique({ where: { id: input.branchId } });
        if (branch === null || branch.tenantId !== input.tenantId) {
          throw new Error("branch must belong to the same tenant");
        }

        let delta: number;
        switch (input.movementType) {
          case "PURCHASE":
            delta = input.quantity;
            break;
          case "SALE":
            delta = -input.quantity;
            break;
          case "ADJUSTMENT":
            if (input.adjustmentDirection === "IN") {
              delta = input.quantity;
            } else if (input.adjustmentDirection === "OUT") {
              delta = -input.quantity;
            } else {
              throw new Error("adjustmentDirection is required for ADJUSTMENT movements");
            }
            break;
          default:
            throw new Error("unsupported movement type");
        }

        let stockItem = await db.stockItem.findFirst({
          where: { tenantId: input.tenantId, productId: input.productId, branchId: input.branchId },
        });

        if (stockItem === null) {
          stockItem = await db.stockItem.create({
            data: {
              tenantId: input.tenantId,
              productId: input.productId,
              branchId: input.branchId,
              quantity: 0,
            },
          });
        }

        if (delta < 0 && stockItem.quantity < Math.abs(delta)) {
          throw new Error("insufficient stock for this operation");
        }

        const updated = await db.stockItem.update({
          where: { id: stockItem.id },
          data: { quantity: { increment: delta } },
        });

        await db.stockMovement.create({
          data: {
            tenantId: input.tenantId,
            productId: input.productId,
            branchId: input.branchId,
            movementType: input.movementType,
            quantity: delta,
            referenceType: input.referenceType ?? null,
            referenceId: input.referenceId ?? null,
            notes: input.notes ?? null,
          },
        });

        return updated;
      };

      if (transactionClient) {
        return run(transactionClient);
      }

      return prisma.$transaction(run);
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

    async listLowStockItems(tenantId) {
      const [reorderRules, stockItems] = await Promise.all([
        prisma.reorderRule.findMany({
          where: { tenantId, isActive: true },
          select: { productId: true, branchId: true, minQuantity: true, reorderQuantity: true },
        }),
        prisma.stockItem.findMany({
          where: { tenantId },
        }),
      ]);

      const stockItemMap = new Map(
        stockItems.map((item) => [`${item.productId}:${item.branchId}`, item]),
      );

      const lowStockMap = new Map<string, {
        readonly stockItemId: string;
        readonly productId: string;
        readonly branchId: string;
        readonly quantity: number;
        readonly minQuantity: number;
        readonly reorderQuantity: number;
      }>();

      for (const rule of reorderRules) {
        const key = `${rule.productId}:${rule.branchId}`;
        const stockItem = stockItemMap.get(key);
        if (stockItem === undefined || stockItem.quantity > rule.minQuantity) {
          continue;
        }
        lowStockMap.set(key, {
          stockItemId: stockItem.id,
          productId: stockItem.productId,
          branchId: stockItem.branchId,
          quantity: stockItem.quantity,
          minQuantity: rule.minQuantity,
          reorderQuantity: rule.reorderQuantity,
        });
      }

      return Array.from(lowStockMap.values());
    },
  };
}
