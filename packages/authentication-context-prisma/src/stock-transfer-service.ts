export interface StockTransferLineItemRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly stockTransferId: string;
  readonly productId: string;
  readonly quantity: number;
}

export interface StockTransferRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly fromWarehouseId: string;
  readonly toWarehouseId: string;
  readonly fromBranchId: string;
  readonly toBranchId: string;
  readonly status: string;
  readonly notes: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly lineItems: readonly StockTransferLineItemRecord[];
}

export interface StockTransferLineItemInput {
  readonly productId: string;
  readonly quantity: number;
}

export interface StockTransferCreateInput {
  readonly tenantId: string;
  readonly fromWarehouseId: string;
  readonly toWarehouseId: string;
  readonly fromBranchId: string;
  readonly toBranchId: string;
  readonly notes?: string | null;
  readonly items: readonly StockTransferLineItemInput[];
}

export interface StockTransferService {
  createStockTransfer(input: StockTransferCreateInput): Promise<StockTransferRecord>;
  getStockTransfer(args: { tenantId: string; stockTransferId: string }): Promise<StockTransferRecord | null>;
  listStockTransfers(args: { tenantId: string }): Promise<StockTransferRecord[]>;
}

interface StockTransferPrismaClient {
  readonly stockTransfer: {
    create: (args: { data: Record<string, unknown> }) => Promise<StockTransferRecord>;
    findUnique: (args: { where: { id: string } }) => Promise<StockTransferRecord | null>;
    findMany: (args: { where?: Record<string, unknown>; orderBy?: Record<string, unknown> }) => Promise<StockTransferRecord[]>;
  };
  readonly stockTransferLineItem: {
    create: (args: { data: Record<string, unknown> }) => Promise<StockTransferLineItemRecord>;
    findMany: (args: { where?: Record<string, unknown> }) => Promise<StockTransferLineItemRecord[]>;
  };
  readonly warehouse: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string; tenantId: string } | null>;
  };
  readonly branch: {
    findUnique: (args: { where: { tenantId_id: { tenantId: string; id: string } } }) => Promise<{ id: string; tenantId: string } | null>;
  };
  readonly product: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string; tenantId: string } | null>;
  };
  $transaction: {
    <T>(callback: (client: StockTransferPrismaClient) => Promise<T>): Promise<T>;
  };
}

export function createStockTransferService(prisma: StockTransferPrismaClient): StockTransferService {
  return {
    async createStockTransfer(input) {
      return prisma.$transaction(async (tx) => {
        const fromWarehouse = await tx.warehouse.findUnique({ where: { id: input.fromWarehouseId } });
        if (fromWarehouse === null || fromWarehouse.tenantId !== input.tenantId) {
          throw new Error("fromWarehouse must belong to the same tenant");
        }

        const toWarehouse = await tx.warehouse.findUnique({ where: { id: input.toWarehouseId } });
        if (toWarehouse === null || toWarehouse.tenantId !== input.tenantId) {
          throw new Error("toWarehouse must belong to the same tenant");
        }

        const fromBranch = await tx.branch.findUnique({
          where: { tenantId_id: { tenantId: input.tenantId, id: input.fromBranchId } },
        });
        if (fromBranch === null || fromBranch.tenantId !== input.tenantId) {
          throw new Error("fromBranch must belong to the same tenant");
        }

        const toBranch = await tx.branch.findUnique({
          where: { tenantId_id: { tenantId: input.tenantId, id: input.toBranchId } },
        });
        if (toBranch === null || toBranch.tenantId !== input.tenantId) {
          throw new Error("toBranch must belong to the same tenant");
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

        const transfer = await tx.stockTransfer.create({
          data: {
            tenantId: input.tenantId,
            fromWarehouseId: input.fromWarehouseId,
            toWarehouseId: input.toWarehouseId,
            fromBranchId: input.fromBranchId,
            toBranchId: input.toBranchId,
            notes: input.notes ?? null,
          },
        });

        for (const item of input.items) {
          await tx.stockTransferLineItem.create({
            data: {
              tenantId: input.tenantId,
              stockTransferId: transfer.id,
              productId: item.productId,
              quantity: item.quantity,
            },
          });
        }

        return transfer;
      });
    },
    async getStockTransfer({ tenantId, stockTransferId }) {
      const transfer = await prisma.stockTransfer.findUnique({ where: { id: stockTransferId } });
      if (transfer === null || transfer.tenantId !== tenantId) {
        return null;
      }
      const lineItems = await prisma.stockTransferLineItem.findMany({
        where: { tenantId, stockTransferId: transfer.id },
      });
      return { ...transfer, lineItems };
    },
    async listStockTransfers({ tenantId }) {
      const transfers = await prisma.stockTransfer.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
      });
      const result: StockTransferRecord[] = [];
      for (const transfer of transfers) {
        const lineItems = await prisma.stockTransferLineItem.findMany({
          where: { tenantId, stockTransferId: transfer.id },
        });
        result.push({ ...transfer, lineItems });
      }
      return result;
    },
  };
}
