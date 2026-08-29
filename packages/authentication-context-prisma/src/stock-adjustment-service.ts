import { createStockService, type StockPrismaClient } from "./stock-service";

export interface StockAdjustmentLineItemRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly stockAdjustmentId: string;
  readonly productId: string;
  readonly quantity: number;
}

export interface StockAdjustmentRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly branchId: string;
  readonly direction: string;
  readonly notes: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly lineItems: readonly StockAdjustmentLineItemRecord[];
}

export interface StockAdjustmentLineItemInput {
  readonly productId: string;
  readonly quantity: number;
}

export interface StockAdjustmentCreateInput {
  readonly tenantId: string;
  readonly branchId: string;
  readonly direction: "IN" | "OUT";
  readonly notes?: string | null;
  readonly items: readonly StockAdjustmentLineItemInput[];
}

export interface StockAdjustmentService {
  createStockAdjustment(input: StockAdjustmentCreateInput): Promise<StockAdjustmentRecord>;
  getStockAdjustment(args: { tenantId: string; stockAdjustmentId: string }): Promise<StockAdjustmentRecord | null>;
  listStockAdjustments(args: { tenantId: string }): Promise<StockAdjustmentRecord[]>;
}

interface StockAdjustmentPrismaClient {
  readonly stockAdjustment: {
    create: (args: { data: Record<string, unknown> }) => Promise<StockAdjustmentRecord>;
    findUnique: (args: { where: { id: string } }) => Promise<StockAdjustmentRecord | null>;
    findMany: (args: { where?: Record<string, unknown>; orderBy?: Record<string, unknown> }) => Promise<StockAdjustmentRecord[]>;
  };
  readonly stockAdjustmentLineItem: {
    create: (args: { data: Record<string, unknown> }) => Promise<StockAdjustmentLineItemRecord>;
    findMany: (args: { where?: Record<string, unknown> }) => Promise<StockAdjustmentLineItemRecord[]>;
  };
  readonly branch: {
    findUnique: (args: { where: { tenantId_id: { tenantId: string; id: string } } }) => Promise<{ id: string; tenantId: string } | null>;
  };
  readonly product: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string; tenantId: string } | null>;
  };
  readonly stockItem: {
    findFirst: (args: { where: Record<string, unknown> }) => Promise<{ id: string; quantity: number } | null>;
    create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
    update: (args: { data: Record<string, unknown>; where: { id: string } }) => Promise<{ id: string }>;
  };
  readonly stockMovement: {
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  };
  $transaction: {
    <T>(callback: (client: StockAdjustmentPrismaClient) => Promise<T>): Promise<T>;
  };
}

export function createStockAdjustmentService(prisma: StockAdjustmentPrismaClient): StockAdjustmentService {
  const stockService = createStockService(prisma as never);

  return {
    async createStockAdjustment(input) {
      return prisma.$transaction(async (tx) => {
        const branch = await tx.branch.findUnique({
          where: { tenantId_id: { tenantId: input.tenantId, id: input.branchId } },
        });
        if (branch === null || branch.tenantId !== input.tenantId) {
          throw new Error("branch must belong to the same tenant");
        }

        if (input.direction !== "IN" && input.direction !== "OUT") {
          throw new Error("direction must be IN or OUT");
        }

        for (const item of input.items) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (product === null || product.tenantId !== input.tenantId) {
            throw new Error("product must belong to the same tenant");
          }
          if (item.quantity <= 0) {
            throw new Error("quantity must be positive");
          }
        }

        const adjustment = await tx.stockAdjustment.create({
          data: {
            tenantId: input.tenantId,
            branchId: input.branchId,
            direction: input.direction,
            notes: input.notes ?? null,
          },
        });

        for (const item of input.items) {
          await tx.stockAdjustmentLineItem.create({
            data: {
              tenantId: input.tenantId,
              stockAdjustmentId: adjustment.id,
              productId: item.productId,
              quantity: item.quantity,
            },
          });

          await stockService.recordStockMovement(
            {
              tenantId: input.tenantId,
              productId: item.productId,
              branchId: input.branchId,
              movementType: "ADJUSTMENT",
              quantity: item.quantity,
              referenceType: "STOCK_ADJUSTMENT",
              referenceId: adjustment.id,
              notes: `Stock ${input.direction.toLowerCase()} for adjustment ${adjustment.id}`,
              adjustmentDirection: input.direction,
            },
            tx as unknown as StockPrismaClient,
          );
        }

        return adjustment;
      });
    },
    async getStockAdjustment({ tenantId, stockAdjustmentId }) {
      const adjustment = await prisma.stockAdjustment.findUnique({ where: { id: stockAdjustmentId } });
      if (adjustment === null || adjustment.tenantId !== tenantId) {
        return null;
      }
      const lineItems = await prisma.stockAdjustmentLineItem.findMany({
        where: { tenantId, stockAdjustmentId: adjustment.id },
      });
      return { ...adjustment, lineItems };
    },
    async listStockAdjustments({ tenantId }) {
      const adjustments = await prisma.stockAdjustment.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
      });
      const result: StockAdjustmentRecord[] = [];
      for (const adjustment of adjustments) {
        const lineItems = await prisma.stockAdjustmentLineItem.findMany({
          where: { tenantId, stockAdjustmentId: adjustment.id },
        });
        result.push({ ...adjustment, lineItems });
      }
      return result;
    },
  };
}
