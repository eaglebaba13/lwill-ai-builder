import { describe, expect, it, vi } from "vitest";
import { createStockService } from "./stock-service";

function createFixture() {
  type StockItemState = {
    id: string;
    tenantId: string;
    productId: string;
    branchId: string;
    quantity: number;
  };
  type StockMovementState = {
    id: string;
    tenantId: string;
    productId: string;
    branchId: string;
    movementType: string;
    quantity: number;
  };
  const state = {
    stockItems: new Map<string, StockItemState>(),
    stockMovements: new Map<string, StockMovementState>(),
    products: new Map<string, { id: string; tenantId: string }>(),
    branches: new Map<string, { id: string; tenantId: string }>(),
  };
  const prisma = {
    stockItem: {
      findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) =>
        [...state.stockItems.values()].find((s) => s.productId === where.productId && s.branchId === where.branchId && s.tenantId === where.tenantId) ??
        null),
      findMany: vi.fn(async ({ where }: { where?: { tenantId?: string; branchId?: string } }) =>
        [...state.stockItems.values()].filter(
          (s) =>
            s.tenantId === where?.tenantId &&
            (where?.branchId === undefined || s.branchId === where.branchId),
        )),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        state.stockItems.get(where.id) ?? null),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const record = { id: "stock-item-1", ...data } as StockItemState;
        state.stockItems.set(record.id, record);
        return record;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const existing = state.stockItems.get(where.id);
        const updated = { ...existing, ...data } as StockItemState;
        state.stockItems.set(where.id, updated);
        return updated;
      }),
    },
    stockMovement: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const record = { id: "movement-1", ...data } as StockMovementState;
        state.stockMovements.set(record.id, record);
        return record;
      }),
      findMany: vi.fn(async ({ where }: { where?: { tenantId?: string } }) =>
        [...state.stockMovements.values()].filter(
          (s) => s.tenantId === where?.tenantId,
        )),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        state.stockMovements.get(where.id) ?? null),
    },
    product: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        state.products.get(where.id) ?? null),
    },
    branch: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        state.branches.get(where.id) ?? null),
    },
  };
  return { prisma, state };
}

describe("stock service: tenant isolation", () => {
  it("lists only stock items belonging to the requesting tenant", async () => {
    const { prisma, state } = createFixture();
    state.stockItems.set("si-1", {
      id: "si-1", tenantId: "tenant-1", productId: "p1", branchId: "b1", quantity: 100,
    });
    state.stockItems.set("si-2", {
      id: "si-2", tenantId: "tenant-2", productId: "p2", branchId: "b2", quantity: 50,
    });
    const service = createStockService(prisma as never);

    const items = await service.listStockItems({ tenantId: "tenant-1" });

    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe("si-1");
  });

  it("returns null when getting a stock item by ID belonging to another tenant", async () => {
    const { prisma, state } = createFixture();
    state.stockItems.set("si-1", {
      id: "si-1", tenantId: "tenant-2", productId: "p1", branchId: "b1", quantity: 100,
    });
    const service = createStockService(prisma as never);

    const item = await service.getStockItemById({ tenantId: "tenant-1", stockItemId: "si-1" });

    expect(item).toBeNull();
  });

  it("returns null when getting a non-existent stock item", async () => {
    const { prisma } = createFixture();
    const service = createStockService(prisma as never);

    const item = await service.getStockItemById({ tenantId: "tenant-1", stockItemId: "missing" });

    expect(item).toBeNull();
  });

  it("returns the stock item when ID belongs to the requesting tenant", async () => {
    const { prisma, state } = createFixture();
    state.stockItems.set("si-1", {
      id: "si-1", tenantId: "tenant-1", productId: "p1", branchId: "b1", quantity: 100,
    });
    const service = createStockService(prisma as never);

    const item = await service.getStockItemById({ tenantId: "tenant-1", stockItemId: "si-1" });

    expect(item).not.toBeNull();
    expect(item?.id).toBe("si-1");
  });
});

describe("stock service: stock movements", () => {
  it("lists only movements belonging to the requesting tenant", async () => {
    const { prisma, state } = createFixture();
    state.stockMovements.set("sm-1", {
      id: "sm-1", tenantId: "tenant-1", productId: "p1", branchId: "b1",
      movementType: "SALE", quantity: -5,
    });
    state.stockMovements.set("sm-2", {
      id: "sm-2", tenantId: "tenant-2", productId: "p2", branchId: "b2",
      movementType: "SALE", quantity: -3,
    });
    const service = createStockService(prisma as never);

    const movements = await service.listStockMovements({ tenantId: "tenant-1" });

    expect(movements).toHaveLength(1);
    expect(movements[0]?.id).toBe("sm-1");
  });

  it("returns null when getting a movement by ID belonging to another tenant", async () => {
    const { prisma, state } = createFixture();
    state.stockMovements.set("sm-1", {
      id: "sm-1", tenantId: "tenant-2", productId: "p1", branchId: "b1",
      movementType: "SALE", quantity: -5,
    });
    const service = createStockService(prisma as never);

    const movement = await service.getStockMovement({ tenantId: "tenant-1", stockMovementId: "sm-1" });

    expect(movement).toBeNull();
  });

  it("returns null when getting a non-existent movement", async () => {
    const { prisma } = createFixture();
    const service = createStockService(prisma as never);

    const movement = await service.getStockMovement({ tenantId: "tenant-1", stockMovementId: "missing" });

    expect(movement).toBeNull();
  });

  it("returns the movement when ID belongs to the requesting tenant", async () => {
    const { prisma, state } = createFixture();
    state.stockMovements.set("sm-1", {
      id: "sm-1", tenantId: "tenant-1", productId: "p1", branchId: "b1",
      movementType: "SALE", quantity: -5,
    });
    const service = createStockService(prisma as never);

    const movement = await service.getStockMovement({ tenantId: "tenant-1", stockMovementId: "sm-1" });

    expect(movement).not.toBeNull();
    expect(movement?.id).toBe("sm-1");
    expect(movement?.movementType).toBe("SALE");
  });
});

describe("stock service: deductStock tenant validation", () => {
  it("throws when the product belongs to another tenant", async () => {
    const { prisma, state } = createFixture();
    state.products.set("p1", { id: "p1", tenantId: "tenant-2" });
    state.branches.set("b1", { id: "b1", tenantId: "tenant-1" });
    const service = createStockService(prisma as never);

    await expect(
      service.deductStock({
        tenantId: "tenant-1",
        productId: "p1",
        branchId: "b1",
        quantity: 5,
        referenceType: "SALE",
        referenceId: "sale-1",
      }),
    ).rejects.toThrow("product must belong to the same tenant");
  });

  it("throws when the branch belongs to another tenant", async () => {
    const { prisma, state } = createFixture();
    state.products.set("p1", { id: "p1", tenantId: "tenant-1" });
    state.branches.set("b1", { id: "b1", tenantId: "tenant-2" });
    const service = createStockService(prisma as never);

    await expect(
      service.deductStock({
        tenantId: "tenant-1",
        productId: "p1",
        branchId: "b1",
        quantity: 5,
        referenceType: "SALE",
        referenceId: "sale-1",
      }),
    ).rejects.toThrow("branch must belong to the same tenant");
  });
});
