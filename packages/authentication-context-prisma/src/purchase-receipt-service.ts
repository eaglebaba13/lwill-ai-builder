export interface PurchaseReceiptLineItemRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly purchaseReceiptId: string;
  readonly productId: string;
  readonly quantity: number;
}

export interface PurchaseReceiptRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly supplierId: string | null;
  readonly warehouseId: string;
  readonly branchId: string;
  readonly receivedBy: string | null;
  readonly receivedAt: Date;
  readonly notes: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly lineItems: readonly PurchaseReceiptLineItemRecord[];
}

export interface PurchaseReceiptLineItemInput {
  readonly productId: string;
  readonly quantity: number;
}

export interface PurchaseReceiptCreateInput {
  readonly tenantId: string;
  readonly supplierId?: string | null;
  readonly warehouseId: string;
  readonly branchId: string;
  readonly receivedBy?: string | null;
  readonly receivedAt?: Date;
  readonly notes?: string | null;
  readonly items: readonly PurchaseReceiptLineItemInput[];
}

export interface PurchaseReceiptService {
  createPurchaseReceipt(input: PurchaseReceiptCreateInput): Promise<PurchaseReceiptRecord>;
  getPurchaseReceipt(args: { tenantId: string; purchaseReceiptId: string }): Promise<PurchaseReceiptRecord | null>;
  listPurchaseReceipts(args: { tenantId: string }): Promise<PurchaseReceiptRecord[]>;
}

interface PurchaseReceiptPrismaClient {
  readonly purchaseReceipt: {
    create: (args: { data: Record<string, unknown> }) => Promise<PurchaseReceiptRecord>;
    findUnique: (args: { where: { id: string } }) => Promise<PurchaseReceiptRecord | null>;
    findMany: (args: { where?: Record<string, unknown>; orderBy?: Record<string, unknown> }) => Promise<PurchaseReceiptRecord[]>;
  };
  readonly purchaseReceiptLineItem: {
    create: (args: { data: Record<string, unknown> }) => Promise<PurchaseReceiptLineItemRecord>;
    findMany: (args: { where?: Record<string, unknown> }) => Promise<PurchaseReceiptLineItemRecord[]>;
  };
  readonly supplier: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string; tenantId: string } | null>;
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
    <T>(callback: (client: PurchaseReceiptPrismaClient) => Promise<T>): Promise<T>;
  };
}

export function createPurchaseReceiptService(prisma: PurchaseReceiptPrismaClient): PurchaseReceiptService {
  return {
    async createPurchaseReceipt(input) {
      return prisma.$transaction(async (tx) => {
        if (input.supplierId) {
          const supplier = await tx.supplier.findUnique({ where: { id: input.supplierId } });
          if (supplier === null || supplier.tenantId !== input.tenantId) {
            throw new Error("supplier must belong to the same tenant");
          }
        }

        const warehouse = await tx.warehouse.findUnique({ where: { id: input.warehouseId } });
        if (warehouse === null || warehouse.tenantId !== input.tenantId) {
          throw new Error("warehouse must belong to the same tenant");
        }

        const branch = await tx.branch.findUnique({
          where: { tenantId_id: { tenantId: input.tenantId, id: input.branchId } },
        });
        if (branch === null || branch.tenantId !== input.tenantId) {
          throw new Error("branch must belong to the same tenant");
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

        const receipt = await tx.purchaseReceipt.create({
          data: {
            tenantId: input.tenantId,
            supplierId: input.supplierId ?? null,
            warehouseId: input.warehouseId,
            branchId: input.branchId,
            receivedBy: input.receivedBy ?? null,
            receivedAt: input.receivedAt ?? new Date(),
            notes: input.notes ?? null,
          },
        });

        for (const item of input.items) {
          await tx.purchaseReceiptLineItem.create({
            data: {
              tenantId: input.tenantId,
              purchaseReceiptId: receipt.id,
              productId: item.productId,
              quantity: item.quantity,
            },
          });
        }

        return receipt;
      });
    },
    async getPurchaseReceipt({ tenantId, purchaseReceiptId }) {
      const receipt = await prisma.purchaseReceipt.findUnique({ where: { id: purchaseReceiptId } });
      if (receipt === null || receipt.tenantId !== tenantId) {
        return null;
      }
      const lineItems = await prisma.purchaseReceiptLineItem.findMany({
        where: { tenantId, purchaseReceiptId: receipt.id },
      });
      return { ...receipt, lineItems };
    },
    async listPurchaseReceipts({ tenantId }) {
      const receipts = await prisma.purchaseReceipt.findMany({
        where: { tenantId },
        orderBy: { receivedAt: "desc" },
      });
      const result: PurchaseReceiptRecord[] = [];
      for (const receipt of receipts) {
        const lineItems = await prisma.purchaseReceiptLineItem.findMany({
          where: { tenantId, purchaseReceiptId: receipt.id },
        });
        result.push({ ...receipt, lineItems });
      }
      return result;
    },
  };
}
