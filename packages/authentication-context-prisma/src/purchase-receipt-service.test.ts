import { describe, expect, it, vi } from "vitest";
import { createPurchaseReceiptService } from "./purchase-receipt-service";

describe("purchase receipt service", () => {
  const createPurchaseReceipt = async ({ data }: { data: Record<string, unknown> }) => ({
    id: "receipt-1",
    ...data,
    lineItems: [] as never,
  } as never);

  const purchaseReceiptService = createPurchaseReceiptService({
    purchaseReceipt: {
      create: createPurchaseReceipt,
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
    $transaction: async (callback: (client: never) => Promise<unknown>) => callback({
      purchaseReceipt: {
        create: createPurchaseReceipt,
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
    } as never),
  } as never);

  it("creates a purchase receipt with line items within the tenant", async () => {
    const receipt = await purchaseReceiptService.createPurchaseReceipt({
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
      $transaction: async (callback: (client: never) => Promise<unknown>) => callback({
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
      } as never),
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
      $transaction: async (callback: (client: never) => Promise<unknown>) => callback({
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
      } as never),
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
      $transaction: async (callback: (client: never) => Promise<unknown>) => callback({
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
      } as never),
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
      $transaction: async (callback: (client: never) => Promise<unknown>) => callback({
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
      } as never),
    } as never);

    const receipt = await service.getPurchaseReceipt({ tenantId: "tenant-1", purchaseReceiptId: "missing" });
    expect(receipt).toBeNull();
  });
});
