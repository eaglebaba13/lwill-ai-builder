import { describe, expect, it, vi } from "vitest";
import { createStockTransferService } from "./stock-transfer-service";

describe("stock transfer service", () => {
  const createStockTransfer = async ({ data }: { data: Record<string, unknown> }) => ({
    id: "transfer-1",
    ...data,
    lineItems: [] as never,
  } as never);

  const stockTransferService = createStockTransferService({
    stockTransfer: {
      create: createStockTransfer,
      findUnique: async () => null,
      findMany: async () => [],
    },
    stockTransferLineItem: {
      create: async () => ({ id: "line-1", tenantId: "tenant-1", stockTransferId: "transfer-1", productId: "product-1", quantity: 10 }),
      findMany: async () => [],
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
      findFirst: async () => ({ id: "si-1", quantity: 50 }),
      create: async () => ({ id: "si-1" }),
      update: async () => ({ id: "si-1" }),
    },
    stockMovement: {
      create: async () => ({}),
    },
    $transaction: async (callback: (client: never) => Promise<unknown>) => callback({
      stockTransfer: {
        create: createStockTransfer,
        findUnique: async () => null,
        findMany: async () => [],
      },
      stockTransferLineItem: {
        create: async () => ({ id: "line-1", tenantId: "tenant-1", stockTransferId: "transfer-1", productId: "product-1", quantity: 10 }),
        findMany: async () => [],
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
        findFirst: async () => ({ id: "si-1", quantity: 50 }),
        create: async () => ({ id: "si-1" }),
        update: async () => ({ id: "si-1" }),
      },
      stockMovement: {
        create: vi.fn(async () => ({})),
      },
    } as never),
  } as never);

  it("creates a stock transfer with line items within the tenant", async () => {
    const transfer = await stockTransferService.createStockTransfer({
      tenantId: "tenant-1",
      fromWarehouseId: "warehouse-1",
      toWarehouseId: "warehouse-2",
      fromBranchId: "branch-1",
      toBranchId: "branch-2",
      items: [
        { productId: "product-1", quantity: 10 },
        { productId: "product-2", quantity: 5 },
      ],
    });

    expect(transfer.tenantId).toBe("tenant-1");
    expect(transfer.fromWarehouseId).toBe("warehouse-1");
    expect(transfer.toWarehouseId).toBe("warehouse-2");
  });

  it("rejects cross-tenant fromWarehouse lookup", async () => {
    const service = createStockTransferService({
      stockTransfer: {
        create: async () => ({ id: "transfer-1", tenantId: "tenant-1", fromWarehouseId: "warehouse-1", toWarehouseId: "warehouse-2", fromBranchId: "branch-1", toBranchId: "branch-2", status: "PENDING", notes: null, createdAt: new Date(), updatedAt: new Date(), lineItems: [] }),
        findUnique: async () => null,
        findMany: async () => [],
      },
      stockTransferLineItem: {
        create: async () => ({ id: "line-1", tenantId: "tenant-1", stockTransferId: "transfer-1", productId: "product-1", quantity: 10 }),
        findMany: async () => [],
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
        stockTransfer: {
          create: async () => ({ id: "transfer-1", tenantId: "tenant-1", fromWarehouseId: "warehouse-1", toWarehouseId: "warehouse-2", fromBranchId: "branch-1", toBranchId: "branch-2", status: "PENDING", notes: null, createdAt: new Date(), updatedAt: new Date(), lineItems: [] }),
          findUnique: async () => null,
          findMany: async () => [],
        },
        stockTransferLineItem: {
          create: async () => ({ id: "line-1", tenantId: "tenant-1", stockTransferId: "transfer-1", productId: "product-1", quantity: 10 }),
          findMany: async () => [],
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

    await expect(service.createStockTransfer({
      tenantId: "tenant-1",
      fromWarehouseId: "warehouse-1",
      toWarehouseId: "warehouse-2",
      fromBranchId: "branch-1",
      toBranchId: "branch-2",
      items: [{ productId: "product-1", quantity: 10 }],
    })).rejects.toThrow("fromWarehouse must belong to the same tenant");
  });

  it("rejects non-positive quantity", async () => {
    const service = createStockTransferService({
      stockTransfer: {
        create: async () => ({ id: "transfer-1", tenantId: "tenant-1", fromWarehouseId: "warehouse-1", toWarehouseId: "warehouse-2", fromBranchId: "branch-1", toBranchId: "branch-2", status: "PENDING", notes: null, createdAt: new Date(), updatedAt: new Date(), lineItems: [] }),
        findUnique: async () => null,
        findMany: async () => [],
      },
      stockTransferLineItem: {
        create: async () => ({ id: "line-1", tenantId: "tenant-1", stockTransferId: "transfer-1", productId: "product-1", quantity: 10 }),
        findMany: async () => [],
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
        stockTransfer: {
          create: async () => ({ id: "transfer-1", tenantId: "tenant-1", fromWarehouseId: "warehouse-1", toWarehouseId: "warehouse-2", fromBranchId: "branch-1", toBranchId: "branch-2", status: "PENDING", notes: null, createdAt: new Date(), updatedAt: new Date(), lineItems: [] }),
          findUnique: async () => null,
          findMany: async () => [],
        },
        stockTransferLineItem: {
          create: async () => ({ id: "line-1", tenantId: "tenant-1", stockTransferId: "transfer-1", productId: "product-1", quantity: 10 }),
          findMany: async () => [],
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

    await expect(service.createStockTransfer({
      tenantId: "tenant-1",
      fromWarehouseId: "warehouse-1",
      toWarehouseId: "warehouse-2",
      fromBranchId: "branch-1",
      toBranchId: "branch-2",
      items: [{ productId: "product-1", quantity: 0 }],
    })).rejects.toThrow("quantity must be positive");
  });

  it("lists stock transfers for the tenant", async () => {
    const service = createStockTransferService({
      stockTransfer: {
        create: async () => ({ id: "transfer-1", tenantId: "tenant-1", fromWarehouseId: "warehouse-1", toWarehouseId: "warehouse-2", fromBranchId: "branch-1", toBranchId: "branch-2", status: "PENDING", notes: null, createdAt: new Date(), updatedAt: new Date(), lineItems: [] }),
        findUnique: async () => null,
        findMany: async () => [],
      },
      stockTransferLineItem: {
        create: async () => ({ id: "line-1", tenantId: "tenant-1", stockTransferId: "transfer-1", productId: "product-1", quantity: 10 }),
        findMany: async () => [],
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
        stockTransfer: {
          create: async () => ({ id: "transfer-1", tenantId: "tenant-1", fromWarehouseId: "warehouse-1", toWarehouseId: "warehouse-2", fromBranchId: "branch-1", toBranchId: "branch-2", status: "PENDING", notes: null, createdAt: new Date(), updatedAt: new Date(), lineItems: [] }),
          findUnique: async () => null,
          findMany: async () => [],
        },
        stockTransferLineItem: {
          create: async () => ({ id: "line-1", tenantId: "tenant-1", stockTransferId: "transfer-1", productId: "product-1", quantity: 10 }),
          findMany: async () => [],
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

    const transfers = await service.listStockTransfers({ tenantId: "tenant-1" });
    expect(Array.isArray(transfers)).toBe(true);
  });

  it("returns null for missing stock transfer", async () => {
    const service = createStockTransferService({
      stockTransfer: {
        create: async () => ({ id: "transfer-1", tenantId: "tenant-1", fromWarehouseId: "warehouse-1", toWarehouseId: "warehouse-2", fromBranchId: "branch-1", toBranchId: "branch-2", status: "PENDING", notes: null, createdAt: new Date(), updatedAt: new Date(), lineItems: [] }),
        findUnique: async () => null,
        findMany: async () => [],
      },
      stockTransferLineItem: {
        create: async () => ({ id: "line-1", tenantId: "tenant-1", stockTransferId: "transfer-1", productId: "product-1", quantity: 10 }),
        findMany: async () => [],
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
        stockTransfer: {
          create: async () => ({ id: "transfer-1", tenantId: "tenant-1", fromWarehouseId: "warehouse-1", toWarehouseId: "warehouse-2", fromBranchId: "branch-1", toBranchId: "branch-2", status: "PENDING", notes: null, createdAt: new Date(), updatedAt: new Date(), lineItems: [] }),
          findUnique: async () => null,
          findMany: async () => [],
        },
        stockTransferLineItem: {
          create: async () => ({ id: "line-1", tenantId: "tenant-1", stockTransferId: "transfer-1", productId: "product-1", quantity: 10 }),
          findMany: async () => [],
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

    const transfer = await service.getStockTransfer({ tenantId: "tenant-1", stockTransferId: "missing" });
    expect(transfer).toBeNull();
  });

  it("records TRANSFER_OUT and TRANSFER_IN stock movements for each line item", async () => {
    const stockMovementCreate = vi.fn(async () => ({}));
    const stockItemFindFirst = vi.fn(async () => ({ id: "si-1", quantity: 100 }));
    const stockItemUpdate = vi.fn(async () => ({ id: "si-1" }));

    const service = createStockTransferService({
      stockTransfer: {
        create: async () => ({ id: "transfer-1", tenantId: "tenant-1", fromWarehouseId: "warehouse-1", toWarehouseId: "warehouse-2", fromBranchId: "branch-1", toBranchId: "branch-2", status: "PENDING", notes: null, createdAt: new Date(), updatedAt: new Date(), lineItems: [] }),
        findUnique: async () => null,
        findMany: async () => [],
      },
      stockTransferLineItem: {
        create: async () => ({ id: "line-1", tenantId: "tenant-1", stockTransferId: "transfer-1", productId: "product-1", quantity: 10 }),
        findMany: async () => [],
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
        create: async () => ({ id: "si-1" }),
        update: stockItemUpdate,
      },
      stockMovement: {
        create: stockMovementCreate,
      },
      $transaction: async (callback: (client: never) => Promise<unknown>) => callback({
        stockTransfer: {
          create: async () => ({ id: "transfer-1", tenantId: "tenant-1", fromWarehouseId: "warehouse-1", toWarehouseId: "warehouse-2", fromBranchId: "branch-1", toBranchId: "branch-2", status: "PENDING", notes: null, createdAt: new Date(), updatedAt: new Date(), lineItems: [] }),
          findUnique: async () => null,
          findMany: async () => [],
        },
        stockTransferLineItem: {
          create: async () => ({ id: "line-1", tenantId: "tenant-1", stockTransferId: "transfer-1", productId: "product-1", quantity: 10 }),
          findMany: async () => [],
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
          create: async () => ({ id: "si-1" }),
          update: stockItemUpdate,
        },
        stockMovement: {
          create: stockMovementCreate,
        },
      } as never),
    } as never);

    await service.createStockTransfer({
      tenantId: "tenant-1",
      fromWarehouseId: "warehouse-1",
      toWarehouseId: "warehouse-2",
      fromBranchId: "branch-1",
      toBranchId: "branch-2",
      items: [{ productId: "product-1", quantity: 10 }],
    });

    expect(stockMovementCreate).toHaveBeenCalledTimes(2);
    expect(stockMovementCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tenant-1",
        productId: "product-1",
        branchId: "branch-1",
        movementType: "TRANSFER_OUT",
        quantity: -10,
        referenceType: "STOCK_TRANSFER",
        referenceId: "transfer-1",
      }),
    });
    expect(stockMovementCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tenant-1",
        productId: "product-1",
        branchId: "branch-2",
        movementType: "TRANSFER_IN",
        quantity: 10,
        referenceType: "STOCK_TRANSFER",
        referenceId: "transfer-1",
      }),
    });
  });
});
