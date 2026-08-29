import { describe, expect, it, vi } from "vitest";
import { createStockAdjustmentService } from "./stock-adjustment-service";

describe("stock adjustment service", () => {
  const createStockAdjustment = async ({ data }: { data: Record<string, unknown> }) => ({
    id: "adjustment-1",
    ...data,
    lineItems: [] as never,
  } as never);

  const stockItem = { findFirst: async () => null, create: async () => ({ id: "stock-item-1" }), update: async () => ({ id: "stock-item-1" }) };
  const stockMovement = { create: async () => ({ id: "movement-1" }) };

  const stockAdjustmentService = createStockAdjustmentService({
    stockAdjustment: {
      create: createStockAdjustment,
      findUnique: async () => null,
      findMany: async () => [],
    },
    stockAdjustmentLineItem: {
      create: async () => ({ id: "line-1", tenantId: "tenant-1", stockAdjustmentId: "adjustment-1", productId: "product-1", quantity: 10 }),
      findMany: async () => [],
    },
    branch: {
      findUnique: async () => ({ id: "branch-1", tenantId: "tenant-1" }),
    },
    product: {
      findUnique: async () => ({ id: "product-1", tenantId: "tenant-1" }),
    },
    stockItem,
    stockMovement,
    $transaction: async (callback: (client: never) => Promise<unknown>) => callback({
      stockAdjustment: {
        create: createStockAdjustment,
        findUnique: async () => null,
        findMany: async () => [],
      },
      stockAdjustmentLineItem: {
        create: async () => ({ id: "line-1", tenantId: "tenant-1", stockAdjustmentId: "adjustment-1", productId: "product-1", quantity: 10 }),
        findMany: async () => [],
      },
      branch: {
        findUnique: async () => ({ id: "branch-1", tenantId: "tenant-1" }),
      },
      product: {
        findUnique: async () => ({ id: "product-1", tenantId: "tenant-1" }),
      },
      stockItem,
      stockMovement,
    } as never),
  } as never);

  it("creates a stock adjustment with line items within the tenant", async () => {
    const adjustment = await stockAdjustmentService.createStockAdjustment({
      tenantId: "tenant-1",
      branchId: "branch-1",
      direction: "IN",
      items: [
        { productId: "product-1", quantity: 10 },
        { productId: "product-2", quantity: 5 },
      ],
    });

    expect(adjustment.tenantId).toBe("tenant-1");
    expect(adjustment.branchId).toBe("branch-1");
    expect(adjustment.direction).toBe("IN");
  });

  it("records stock movements for adjustment line items", async () => {
    const movementCreate = vi.fn(async () => ({ id: "movement-1" }));
    const stockItemCreate = vi.fn(async () => ({ id: "stock-item-1" }));
    const service = createStockAdjustmentService({
      stockAdjustment: {
        create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "adjustment-1", ...data, lineItems: [] }),
        findUnique: async () => null,
        findMany: async () => [],
      },
      stockAdjustmentLineItem: {
        create: async () => ({ id: "line-1", tenantId: "tenant-1", stockAdjustmentId: "adjustment-1", productId: "product-1", quantity: 10 }),
        findMany: async () => [],
      },
      branch: {
        findUnique: async () => ({ id: "branch-1", tenantId: "tenant-1" }),
      },
      product: {
        findUnique: async () => ({ id: "product-1", tenantId: "tenant-1" }),
      },
      stockItem: {
        findFirst: async () => null,
        create: stockItemCreate,
        update: async () => ({ id: "stock-item-1" }),
      },
      stockMovement: {
        create: movementCreate,
      },
      $transaction: async (callback: (client: never) => Promise<unknown>) => callback({
        stockAdjustment: {
          create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "adjustment-1", ...data, lineItems: [] }),
          findUnique: async () => null,
          findMany: async () => [],
        },
        stockAdjustmentLineItem: {
          create: async () => ({ id: "line-1", tenantId: "tenant-1", stockAdjustmentId: "adjustment-1", productId: "product-1", quantity: 10 }),
          findMany: async () => [],
        },
        branch: {
          findUnique: async () => ({ id: "branch-1", tenantId: "tenant-1" }),
        },
        product: {
          findUnique: async () => ({ id: "product-1", tenantId: "tenant-1" }),
        },
        stockItem: {
          findFirst: async () => null,
          create: stockItemCreate,
          update: async () => ({ id: "stock-item-1" }),
        },
        stockMovement: {
          create: movementCreate,
        },
      } as never),
    } as never);

    await service.createStockAdjustment({
      tenantId: "tenant-1",
      branchId: "branch-1",
      direction: "OUT",
      items: [{ productId: "product-1", quantity: 5 }],
    });

    expect(movementCreate).toHaveBeenCalledTimes(1);
    expect(movementCreate).toHaveBeenCalledWith({
      data: {
        tenantId: "tenant-1",
        productId: "product-1",
        branchId: "branch-1",
        movementType: "ADJUSTMENT",
        quantity: -5,
        referenceType: "STOCK_ADJUSTMENT",
        referenceId: "adjustment-1",
        notes: "Stock out for adjustment adjustment-1",
      },
    });
  });

  it("rejects cross-tenant branch lookup", async () => {
    const service = createStockAdjustmentService({
      stockAdjustment: {
        create: async () => ({ id: "adjustment-1", tenantId: "tenant-1", branchId: "branch-1", direction: "IN", notes: null, createdAt: new Date(), updatedAt: new Date(), lineItems: [] }),
        findUnique: async () => null,
        findMany: async () => [],
      },
      stockAdjustmentLineItem: {
        create: async () => ({ id: "line-1", tenantId: "tenant-1", stockAdjustmentId: "adjustment-1", productId: "product-1", quantity: 10 }),
        findMany: async () => [],
      },
      branch: {
        findUnique: async () => ({ id: "branch-1", tenantId: "tenant-2" }),
      },
      product: {
        findUnique: async () => ({ id: "product-1", tenantId: "tenant-1" }),
      },
      stockItem,
      stockMovement,
      $transaction: async (callback: (client: never) => Promise<unknown>) => callback({
        stockAdjustment: {
          create: async () => ({ id: "adjustment-1", tenantId: "tenant-1", branchId: "branch-1", direction: "IN", notes: null, createdAt: new Date(), updatedAt: new Date(), lineItems: [] }),
          findUnique: async () => null,
          findMany: async () => [],
        },
        stockAdjustmentLineItem: {
          create: async () => ({ id: "line-1", tenantId: "tenant-1", stockAdjustmentId: "adjustment-1", productId: "product-1", quantity: 10 }),
          findMany: async () => [],
        },
        branch: {
          findUnique: async () => ({ id: "branch-1", tenantId: "tenant-2" }),
        },
        product: {
          findUnique: async () => ({ id: "product-1", tenantId: "tenant-1" }),
        },
        stockItem,
        stockMovement,
      } as never),
    } as never);

    await expect(service.createStockAdjustment({
      tenantId: "tenant-1",
      branchId: "branch-1",
      direction: "IN",
      items: [{ productId: "product-1", quantity: 10 }],
    })).rejects.toThrow("branch must belong to the same tenant");
  });

  it("rejects non-positive quantity", async () => {
    const service = createStockAdjustmentService({
      stockAdjustment: {
        create: async () => ({ id: "adjustment-1", tenantId: "tenant-1", branchId: "branch-1", direction: "IN", notes: null, createdAt: new Date(), updatedAt: new Date(), lineItems: [] }),
        findUnique: async () => null,
        findMany: async () => [],
      },
      stockAdjustmentLineItem: {
        create: async () => ({ id: "line-1", tenantId: "tenant-1", stockAdjustmentId: "adjustment-1", productId: "product-1", quantity: 10 }),
        findMany: async () => [],
      },
      branch: {
        findUnique: async () => ({ id: "branch-1", tenantId: "tenant-1" }),
      },
      product: {
        findUnique: async () => ({ id: "product-1", tenantId: "tenant-1" }),
      },
      stockItem,
      stockMovement,
      $transaction: async (callback: (client: never) => Promise<unknown>) => callback({
        stockAdjustment: {
          create: async () => ({ id: "adjustment-1", tenantId: "tenant-1", branchId: "branch-1", direction: "IN", notes: null, createdAt: new Date(), updatedAt: new Date(), lineItems: [] }),
          findUnique: async () => null,
          findMany: async () => [],
        },
        stockAdjustmentLineItem: {
          create: async () => ({ id: "line-1", tenantId: "tenant-1", stockAdjustmentId: "adjustment-1", productId: "product-1", quantity: 10 }),
          findMany: async () => [],
        },
        branch: {
          findUnique: async () => ({ id: "branch-1", tenantId: "tenant-1" }),
        },
        product: {
          findUnique: async () => ({ id: "product-1", tenantId: "tenant-1" }),
        },
        stockItem,
        stockMovement,
      } as never),
    } as never);

    await expect(service.createStockAdjustment({
      tenantId: "tenant-1",
      branchId: "branch-1",
      direction: "IN",
      items: [{ productId: "product-1", quantity: 0 }],
    })).rejects.toThrow("quantity must be positive");
  });

  it("lists stock adjustments for the tenant", async () => {
    const service = createStockAdjustmentService({
      stockAdjustment: {
        create: async () => ({ id: "adjustment-1", tenantId: "tenant-1", branchId: "branch-1", direction: "IN", notes: null, createdAt: new Date(), updatedAt: new Date(), lineItems: [] }),
        findUnique: async () => null,
        findMany: async () => [],
      },
      stockAdjustmentLineItem: {
        create: async () => ({ id: "line-1", tenantId: "tenant-1", stockAdjustmentId: "adjustment-1", productId: "product-1", quantity: 10 }),
        findMany: async () => [],
      },
      branch: {
        findUnique: async () => ({ id: "branch-1", tenantId: "tenant-1" }),
      },
      product: {
        findUnique: async () => ({ id: "product-1", tenantId: "tenant-1" }),
      },
      stockItem,
      stockMovement,
      $transaction: async (callback: (client: never) => Promise<unknown>) => callback({
        stockAdjustment: {
          create: async () => ({ id: "adjustment-1", tenantId: "tenant-1", branchId: "branch-1", direction: "IN", notes: null, createdAt: new Date(), updatedAt: new Date(), lineItems: [] }),
          findUnique: async () => null,
          findMany: async () => [],
        },
        stockAdjustmentLineItem: {
          create: async () => ({ id: "line-1", tenantId: "tenant-1", stockAdjustmentId: "adjustment-1", productId: "product-1", quantity: 10 }),
          findMany: async () => [],
        },
        branch: {
          findUnique: async () => ({ id: "branch-1", tenantId: "tenant-1" }),
        },
        product: {
          findUnique: async () => ({ id: "product-1", tenantId: "tenant-1" }),
        },
        stockItem,
        stockMovement,
      } as never),
    } as never);

    const adjustments = await service.listStockAdjustments({ tenantId: "tenant-1" });
    expect(Array.isArray(adjustments)).toBe(true);
  });

  it("returns null for missing stock adjustment", async () => {
    const service = createStockAdjustmentService({
      stockAdjustment: {
        create: async () => ({ id: "adjustment-1", tenantId: "tenant-1", branchId: "branch-1", direction: "IN", notes: null, createdAt: new Date(), updatedAt: new Date(), lineItems: [] }),
        findUnique: async () => null,
        findMany: async () => [],
      },
      stockAdjustmentLineItem: {
        create: async () => ({ id: "line-1", tenantId: "tenant-1", stockAdjustmentId: "adjustment-1", productId: "product-1", quantity: 10 }),
        findMany: async () => [],
      },
      branch: {
        findUnique: async () => ({ id: "branch-1", tenantId: "tenant-1" }),
      },
      product: {
        findUnique: async () => ({ id: "product-1", tenantId: "tenant-1" }),
      },
      stockItem,
      stockMovement,
      $transaction: async (callback: (client: never) => Promise<unknown>) => callback({
        stockAdjustment: {
          create: async () => ({ id: "adjustment-1", tenantId: "tenant-1", branchId: "branch-1", direction: "IN", notes: null, createdAt: new Date(), updatedAt: new Date(), lineItems: [] }),
          findUnique: async () => null,
          findMany: async () => [],
        },
        stockAdjustmentLineItem: {
          create: async () => ({ id: "line-1", tenantId: "tenant-1", stockAdjustmentId: "adjustment-1", productId: "product-1", quantity: 10 }),
          findMany: async () => [],
        },
        branch: {
          findUnique: async () => ({ id: "branch-1", tenantId: "tenant-1" }),
        },
        product: {
          findUnique: async () => ({ id: "product-1", tenantId: "tenant-1" }),
        },
        stockItem,
        stockMovement,
      } as never),
    } as never);

    const adjustment = await service.getStockAdjustment({ tenantId: "tenant-1", stockAdjustmentId: "missing" });
    expect(adjustment).toBeNull();
  });
});
