import { describe, expect, it, vi } from "vitest";
import { createPurchaseReceiptService } from "./purchase-receipt-service";

function createMockPrisma(overrides: {
  stockItemFindFirst?: () => Promise<{ id: string; quantity: number } | null>;
  stockItemCreate?: () => Promise<{ id: string }>;
  stockItemUpdate?: () => Promise<{ id: string }>;
  stockMovementCreate?: () => Promise<unknown>;
} = {}) {
  const stockItemFindFirst = overrides.stockItemFindFirst ?? (async () => null);
  const stockItemCreate = overrides.stockItemCreate ?? (async () => ({ id: "stock-item-1" }));
  const stockItemUpdate = overrides.stockItemUpdate ?? (async () => ({ id: "stock-item-1" }));
  const stockMovementCreate = overrides.stockMovementCreate ?? (async () => ({ id: "movement-1" }));

  const mock = {
    purchaseReceipt: {
      create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "receipt-1", ...data, lineItems: [] }),
      findUnique: async () => null,
      findMany: async () => [],
    },
    purchaseReceiptLineItem: {
      create: async () => ({ id: "line-1", tenantId: "tenant-1", purchaseReceiptId: "receipt-1", productId: "product-1", quantity: 10 }),
      findMany: async () => [],
    },
    supplier: {
      findUnique: async () => ({ id: "supplier-1", tenantId: "tenant-1" }),
    },
    warehouse: {
      findUnique: async () => ({ id: "warehouse-1", tenantId: "tenant-1" }),
    },
    branch: {
      findUnique: async () => ({ id: "branch-1", tenantId: "tenant-1" }),
    },
    product: {
      findUnique: async () => ({ id: "product-1", tenantId: "tenant-1" }),
    },
    stockItem: {
      findFirst: stockItemFindFirst,
      create: stockItemCreate,
      update: stockItemUpdate,
    },
    stockMovement: {
      create: stockMovementCreate,
    },
    $transaction: async (callback: (client: unknown) => Promise<unknown>) =>
      callback({
        purchaseReceipt: {
          create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "receipt-1", ...data, lineItems: [] }),
          findUnique: async () => null,
          findMany: async () => [],
        },
        purchaseReceiptLineItem: {
          create: async () => ({ id: "line-1", tenantId: "tenant-1", purchaseReceiptId: "receipt-1", productId: "product-1", quantity: 10 }),
          findMany: async () => [],
        },
        supplier: {
          findUnique: async () => ({ id: "supplier-1", tenantId: "tenant-1" }),
        },
        warehouse: {
          findUnique: async () => ({ id: "warehouse-1", tenantId: "tenant-1" }),
        },
        branch: {
          findUnique: async () => ({ id: "branch-1", tenantId: "tenant-1" }),
        },
        product: {
          findUnique: async () => ({ id: "product-1", tenantId: "tenant-1" }),
        },
        stockItem: {
          findFirst: stockItemFindFirst,
          create: stockItemCreate,
          update: stockItemUpdate,
        },
        stockMovement: {
          create: stockMovementCreate,
        },
      } as unknown),
  };

  return mock;
}

describe("purchase receipt service", () => {
  it("creates a purchase receipt with line items within the tenant", async () => {
    const service = createPurchaseReceiptService(createMockPrisma());

    const receipt = await service.createPurchaseReceipt({
      tenantId: "tenant-1",
      warehouseId: "warehouse-1",
      branchId: "branch-1",
      items: [
        { productId: "product-1", quantity: 10 },
        { productId: "product-2", quantity: 5 },
      ],
    });

    expect(receipt.tenantId).toBe("tenant-1");
    expect(receipt.warehouseId).toBe("warehouse-1");
    expect(receipt.branchId).toBe("branch-1");
  });

  it("records stock movements for each purchase receipt line item", async () => {
    const stockMovementCreate = vi.fn(async () => ({ id: "movement-1" }));
    const service = createPurchaseReceiptService(
      createMockPrisma({
        stockMovementCreate,
      }),
    );

    await service.createPurchaseReceipt({
      tenantId: "tenant-1",
      warehouseId: "warehouse-1",
      branchId: "branch-1",
      items: [
        { productId: "product-1", quantity: 10 },
        { productId: "product-2", quantity: 5 },
      ],
    });

    expect(stockMovementCreate).toHaveBeenCalledTimes(2);
    expect(stockMovementCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          movementType: "PURCHASE",
          quantity: 10,
          referenceType: "PURCHASE_RECEIPT",
        }),
      }),
    );
  });

  it("rejects cross-tenant warehouse lookup", async () => {
    const service = createPurchaseReceiptService({
      purchaseReceipt: {
        create: async () => ({ id: "receipt-1", tenantId: "tenant-1", supplierId: null, warehouseId: "warehouse-1", branchId: "branch-1", receivedBy: null, receivedAt: new Date(), notes: null, createdAt: new Date(), updatedAt: new Date(), lineItems: [] }),
        findUnique: async () => null,
        findMany: async () => [],
      },
      purchaseReceiptLineItem: {
        create: async () => ({ id: "line-1", tenantId: "tenant-1", purchaseReceiptId: "receipt-1", productId: "product-1", quantity: 10 }),
        findMany: async () => [],
      },
      supplier: {
        findUnique: async () => ({ id: "supplier-1", tenantId: "tenant-1" }),
      },
      warehouse: {
        findUnique: async () => ({ id: "warehouse-1", tenantId: "tenant-2" }),
      },
      branch: {
        findUnique: async () => ({ id: "branch-1", tenantId: "tenant-1" }),
      },
      product: {
        findUnique: async () => ({ id: "product-1", tenantId: "tenant-1" }),
      },
      stockItem: {
        findFirst: async () => null,
        create: async () => ({ id: "stock-item-1" }),
        update: async () => ({ id: "stock-item-1" }),
      },
      stockMovement: {
        create: async () => ({ id: "movement-1" }),
      },
      $transaction: async (callback: (client: unknown) => Promise<unknown>) => callback({
        purchaseReceipt: {
          create: async () => ({ id: "receipt-1", tenantId: "tenant-1", supplierId: null, warehouseId: "warehouse-1", branchId: "branch-1", receivedBy: null, receivedAt: new Date(), notes: null, createdAt: new Date(), updatedAt: new Date(), lineItems: [] }),
          findUnique: async () => null,
          findMany: async () => [],
        },
        purchaseReceiptLineItem: {
          create: async () => ({ id: "line-1", tenantId: "tenant-1", purchaseReceiptId: "receipt-1", productId: "product-1", quantity: 10 }),
          findMany: async () => [],
        },
        supplier: {
          findUnique: async () => ({ id: "supplier-1", tenantId: "tenant-1" }),
        },
        warehouse: {
          findUnique: async () => ({ id: "warehouse-1", tenantId: "tenant-2" }),
        },
        branch: {
          findUnique: async () => ({ id: "branch-1", tenantId: "tenant-1" }),
        },
        product: {
          findUnique: async () => ({ id: "product-1", tenantId: "tenant-1" }),
        },
        stockItem: {
          findFirst: async () => null,
          create: async () => ({ id: "stock-item-1" }),
          update: async () => ({ id: "stock-item-1" }),
        },
        stockMovement: {
          create: async () => ({ id: "movement-1" }),
        },
      } as unknown),
    } as never);

    await expect(service.createPurchaseReceipt({
      tenantId: "tenant-1",
      warehouseId: "warehouse-1",
      branchId: "branch-1",
      items: [{ productId: "product-1", quantity: 10 }],
    })).rejects.toThrow("warehouse must belong to the same tenant");
  });

  it("rejects non-positive quantity", async () => {
    const service = createPurchaseReceiptService({
      purchaseReceipt: {
        create: async () => ({ id: "receipt-1", tenantId: "tenant-1", supplierId: null, warehouseId: "warehouse-1", branchId: "branch-1", receivedBy: null, receivedAt: new Date(), notes: null, createdAt: new Date(), updatedAt: new Date(), lineItems: [] }),
        findUnique: async () => null,
        findMany: async () => [],
      },
      purchaseReceiptLineItem: {
        create: async () => ({ id: "line-1", tenantId: "tenant-1", purchaseReceiptId: "receipt-1", productId: "product-1", quantity: 10 }),
        findMany: async () => [],
      },
      supplier: {
        findUnique: async () => ({ id: "supplier-1", tenantId: "tenant-1" }),
      },
      warehouse: {
        findUnique: async () => ({ id: "warehouse-1", tenantId: "tenant-1" }),
      },
      branch: {
        findUnique: async () => ({ id: "branch-1", tenantId: "tenant-1" }),
      },
      product: {
        findUnique: async () => ({ id: "product-1", tenantId: "tenant-1" }),
      },
      stockItem: {
        findFirst: async () => null,
        create: async () => ({ id: "stock-item-1" }),
        update: async () => ({ id: "stock-item-1" }),
      },
      stockMovement: {
        create: async () => ({ id: "movement-1" }),
      },
      $transaction: async (callback: (client: unknown) => Promise<unknown>) => callback({
        purchaseReceipt: {
          create: async () => ({ id: "receipt-1", tenantId: "tenant-1", supplierId: null, warehouseId: "warehouse-1", branchId: "branch-1", receivedBy: null, receivedAt: new Date(), notes: null, createdAt: new Date(), updatedAt: new Date(), lineItems: [] }),
          findUnique: async () => null,
          findMany: async () => [],
        },
        purchaseReceiptLineItem: {
          create: async () => ({ id: "line-1", tenantId: "tenant-1", purchaseReceiptId: "receipt-1", productId: "product-1", quantity: 10 }),
          findMany: async () => [],
        },
        supplier: {
          findUnique: async () => ({ id: "supplier-1", tenantId: "tenant-1" }),
        },
        warehouse: {
          findUnique: async () => ({ id: "warehouse-1", tenantId: "tenant-1" }),
        },
        branch: {
          findUnique: async () => ({ id: "branch-1", tenantId: "tenant-1" }),
        },
        product: {
          findUnique: async () => ({ id: "product-1", tenantId: "tenant-1" }),
        },
        stockItem: {
          findFirst: async () => null,
          create: async () => ({ id: "stock-item-1" }),
          update: async () => ({ id: "stock-item-1" }),
        },
        stockMovement: {
          create: async () => ({ id: "movement-1" }),
        },
      } as unknown),
    } as never);

    await expect(service.createPurchaseReceipt({
      tenantId: "tenant-1",
      warehouseId: "warehouse-1",
      branchId: "branch-1",
      items: [{ productId: "product-1", quantity: 0 }],
    })).rejects.toThrow("quantity must be positive");
  });

  it("lists purchase receipts for the tenant", async () => {
    const service = createPurchaseReceiptService({
      purchaseReceipt: {
        create: async () => ({ id: "receipt-1", tenantId: "tenant-1", supplierId: null, warehouseId: "warehouse-1", branchId: "branch-1", receivedBy: null, receivedAt: new Date(), notes: null, createdAt: new Date(), updatedAt: new Date(), lineItems: [] }),
        findUnique: async () => null,
        findMany: async () => [],
      },
      purchaseReceiptLineItem: {
        create: async () => ({ id: "line-1", tenantId: "tenant-1", purchaseReceiptId: "receipt-1", productId: "product-1", quantity: 10 }),
        findMany: async () => [],
      },
      supplier: {
        findUnique: async () => ({ id: "supplier-1", tenantId: "tenant-1" }),
      },
      warehouse: {
        findUnique: async () => ({ id: "warehouse-1", tenantId: "tenant-1" }),
      },
      branch: {
        findUnique: async () => ({ id: "branch-1", tenantId: "tenant-1" }),
      },
      product: {
        findUnique: async () => ({ id: "product-1", tenantId: "tenant-1" }),
      },
      stockItem: {
        findFirst: async () => null,
        create: async () => ({ id: "stock-item-1" }),
        update: async () => ({ id: "stock-item-1" }),
      },
      stockMovement: {
        create: async () => ({ id: "movement-1" }),
      },
      $transaction: async (callback: (client: unknown) => Promise<unknown>) => callback({
        purchaseReceipt: {
          create: async () => ({ id: "receipt-1", tenantId: "tenant-1", supplierId: null, warehouseId: "warehouse-1", branchId: "branch-1", receivedBy: null, receivedAt: new Date(), notes: null, createdAt: new Date(), updatedAt: new Date(), lineItems: [] }),
          findUnique: async () => null,
          findMany: async () => [],
        },
        purchaseReceiptLineItem: {
          create: async () => ({ id: "line-1", tenantId: "tenant-1", purchaseReceiptId: "receipt-1", productId: "product-1", quantity: 10 }),
          findMany: async () => [],
        },
        supplier: {
          findUnique: async () => ({ id: "supplier-1", tenantId: "tenant-1" }),
        },
        warehouse: {
          findUnique: async () => ({ id: "warehouse-1", tenantId: "tenant-1" }),
        },
        branch: {
          findUnique: async () => ({ id: "branch-1", tenantId: "tenant-1" }),
        },
        product: {
          findUnique: async () => ({ id: "product-1", tenantId: "tenant-1" }),
        },
        stockItem: {
          findFirst: async () => null,
          create: async () => ({ id: "stock-item-1" }),
          update: async () => ({ id: "stock-item-1" }),
        },
        stockMovement: {
          create: async () => ({ id: "movement-1" }),
        },
      } as unknown),
    } as never);

    const receipts = await service.listPurchaseReceipts({ tenantId: "tenant-1" });
    expect(Array.isArray(receipts)).toBe(true);
  });

  it("returns null for missing purchase receipt", async () => {
    const service = createPurchaseReceiptService({
      purchaseReceipt: {
        create: async () => ({ id: "receipt-1", tenantId: "tenant-1", supplierId: null, warehouseId: "warehouse-1", branchId: "branch-1", receivedBy: null, receivedAt: new Date(), notes: null, createdAt: new Date(), updatedAt: new Date(), lineItems: [] }),
        findUnique: async () => null,
        findMany: async () => [],
      },
      purchaseReceiptLineItem: {
        create: async () => ({ id: "line-1", tenantId: "tenant-1", purchaseReceiptId: "receipt-1", productId: "product-1", quantity: 10 }),
        findMany: async () => [],
      },
      supplier: {
        findUnique: async () => ({ id: "supplier-1", tenantId: "tenant-1" }),
      },
      warehouse: {
        findUnique: async () => ({ id: "warehouse-1", tenantId: "tenant-1" }),
      },
      branch: {
        findUnique: async () => ({ id: "branch-1", tenantId: "tenant-1" }),
      },
      product: {
        findUnique: async () => ({ id: "product-1", tenantId: "tenant-1" }),
      },
      stockItem: {
        findFirst: async () => null,
        create: async () => ({ id: "stock-item-1" }),
        update: async () => ({ id: "stock-item-1" }),
      },
      stockMovement: {
        create: async () => ({ id: "movement-1" }),
      },
      $transaction: async (callback: (client: unknown) => Promise<unknown>) => callback({
        purchaseReceipt: {
          create: async () => ({ id: "receipt-1", tenantId: "tenant-1", supplierId: null, warehouseId: "warehouse-1", branchId: "branch-1", receivedBy: null, receivedAt: new Date(), notes: null, createdAt: new Date(), updatedAt: new Date(), lineItems: [] }),
          findUnique: async () => null,
          findMany: async () => [],
        },
        purchaseReceiptLineItem: {
          create: async () => ({ id: "line-1", tenantId: "tenant-1", purchaseReceiptId: "receipt-1", productId: "product-1", quantity: 10 }),
          findMany: async () => [],
        },
        supplier: {
          findUnique: async () => ({ id: "supplier-1", tenantId: "tenant-1" }),
        },
        warehouse: {
          findUnique: async () => ({ id: "warehouse-1", tenantId: "tenant-1" }),
        },
        branch: {
          findUnique: async () => ({ id: "branch-1", tenantId: "tenant-1" }),
        },
        product: {
          findUnique: async () => ({ id: "product-1", tenantId: "tenant-1" }),
        },
        stockItem: {
          findFirst: async () => null,
          create: async () => ({ id: "stock-item-1" }),
          update: async () => ({ id: "stock-item-1" }),
        },
        stockMovement: {
          create: async () => ({ id: "movement-1" }),
        },
      } as unknown),
    } as never);

    const receipt = await service.getPurchaseReceipt({ tenantId: "tenant-1", purchaseReceiptId: "missing" });
    expect(receipt).toBeNull();
  });
});
