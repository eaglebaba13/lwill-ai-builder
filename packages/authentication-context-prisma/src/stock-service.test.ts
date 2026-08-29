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
        const resolved: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(data)) {
          if (key === "quantity" && typeof value === "object" && value !== null && "increment" in (value as Record<string, unknown>)) {
            resolved.quantity = (existing?.quantity as number ?? 0) + ((value as Record<string, unknown>).increment as number);
          } else {
            resolved[key] = value;
          }
        }
        const updated = { ...existing, ...resolved } as StockItemState;
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
    $transaction: vi.fn(async (callback: (client: typeof prisma) => Promise<unknown>) => callback(prisma)),
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

describe("stock service: createStockItem", () => {
  it("creates a stock item for a valid product and branch", async () => {
    const { prisma, state } = createFixture();
    state.products.set("p1", { id: "p1", tenantId: "tenant-1" });
    state.branches.set("b1", { id: "b1", tenantId: "tenant-1" });
    const service = createStockService(prisma as never);

    const stockItem = await service.createStockItem({
      tenantId: "tenant-1",
      productId: "p1",
      branchId: "b1",
      quantity: 10,
    });

    expect(stockItem).toMatchObject({
      tenantId: "tenant-1",
      productId: "p1",
      branchId: "b1",
      quantity: 10,
    });
  });

  it("throws when the product belongs to another tenant", async () => {
    const { prisma, state } = createFixture();
    state.products.set("p1", { id: "p1", tenantId: "tenant-2" });
    state.branches.set("b1", { id: "b1", tenantId: "tenant-1" });
    const service = createStockService(prisma as never);

    await expect(
      service.createStockItem({
        tenantId: "tenant-1",
        productId: "p1",
        branchId: "b1",
      }),
    ).rejects.toThrow("product must belong to the same tenant");
  });

  it("throws when the branch belongs to another tenant", async () => {
    const { prisma, state } = createFixture();
    state.products.set("p1", { id: "p1", tenantId: "tenant-1" });
    state.branches.set("b1", { id: "b1", tenantId: "tenant-2" });
    const service = createStockService(prisma as never);

    await expect(
      service.createStockItem({
        tenantId: "tenant-1",
        productId: "p1",
        branchId: "b1",
      }),
    ).rejects.toThrow("branch must belong to the same tenant");
  });

  it("rejects duplicate stock items for the same product and branch", async () => {
    const { prisma, state } = createFixture();
    state.products.set("p1", { id: "p1", tenantId: "tenant-1" });
    state.branches.set("b1", { id: "b1", tenantId: "tenant-1" });
    state.stockItems.set("si-1", {
      id: "si-1", tenantId: "tenant-1", productId: "p1", branchId: "b1", quantity: 5,
    });
    const service = createStockService(prisma as never);

    await expect(
      service.createStockItem({
        tenantId: "tenant-1",
        productId: "p1",
        branchId: "b1",
      }),
    ).rejects.toThrow("stock item already exists for this product and branch");
  });
});

describe("stock service: updateStockItem", () => {
  it("updates quantity for an existing stock item", async () => {
    const { prisma, state } = createFixture();
    state.stockItems.set("si-1", {
      id: "si-1", tenantId: "tenant-1", productId: "p1", branchId: "b1", quantity: 10,
    });
    const service = createStockService(prisma as never);

    const updated = await service.updateStockItem({
      tenantId: "tenant-1",
      stockItemId: "si-1",
      input: { quantity: 20 },
    });

    expect(updated).toMatchObject({ id: "si-1", quantity: 20 });
  });

  it("returns null when updating a non-existent stock item", async () => {
    const { prisma } = createFixture();
    const service = createStockService(prisma as never);

    const updated = await service.updateStockItem({
      tenantId: "tenant-1",
      stockItemId: "missing",
      input: { quantity: 10 },
    });

    expect(updated).toBeNull();
  });

  it("returns null when updating a stock item belonging to another tenant", async () => {
    const { prisma, state } = createFixture();
    state.stockItems.set("si-1", {
      id: "si-1", tenantId: "tenant-2", productId: "p1", branchId: "b1", quantity: 10,
    });
    const service = createStockService(prisma as never);

    const updated = await service.updateStockItem({
      tenantId: "tenant-1",
      stockItemId: "si-1",
      input: { quantity: 20 },
    });

    expect(updated).toBeNull();
  });
});

describe("stock service: recordStockMovement", () => {
  it("creates a PURCHASE movement and increments stock balance atomically", async () => {
    const { prisma, state } = createFixture();
    state.products.set("p1", { id: "p1", tenantId: "tenant-1" });
    state.branches.set("b1", { id: "b1", tenantId: "tenant-1" });
    state.stockItems.set("si-1", {
      id: "si-1", tenantId: "tenant-1", productId: "p1", branchId: "b1", quantity: 10,
    });
    const service = createStockService(prisma as never);

    const updated = await service.recordStockMovement({
      tenantId: "tenant-1",
      productId: "p1",
      branchId: "b1",
      movementType: "PURCHASE",
      quantity: 5,
    });

    expect(updated).toMatchObject({ id: "si-1", quantity: 15 });
    expect(state.stockMovements.size).toBe(1);
    const movement = [...state.stockMovements.values()][0]!;
    expect(movement).toMatchObject({
      tenantId: "tenant-1",
      productId: "p1",
      branchId: "b1",
      movementType: "PURCHASE",
      quantity: 5,
    });
  });

  it("creates a SALE movement and decrements stock balance atomically", async () => {
    const { prisma, state } = createFixture();
    state.products.set("p1", { id: "p1", tenantId: "tenant-1" });
    state.branches.set("b1", { id: "b1", tenantId: "tenant-1" });
    state.stockItems.set("si-1", {
      id: "si-1", tenantId: "tenant-1", productId: "p1", branchId: "b1", quantity: 10,
    });
    const service = createStockService(prisma as never);

    const updated = await service.recordStockMovement({
      tenantId: "tenant-1",
      productId: "p1",
      branchId: "b1",
      movementType: "SALE",
      quantity: 5,
    });

    expect(updated).toMatchObject({ id: "si-1", quantity: 5 });
    expect(state.stockMovements.size).toBe(1);
    const movement = [...state.stockMovements.values()][0]!;
    expect(movement).toMatchObject({
      tenantId: "tenant-1",
      productId: "p1",
      branchId: "b1",
      movementType: "SALE",
      quantity: -5,
    });
  });

  it("creates an ADJUSTMENT_IN movement and increments stock balance", async () => {
    const { prisma, state } = createFixture();
    state.products.set("p1", { id: "p1", tenantId: "tenant-1" });
    state.branches.set("b1", { id: "b1", tenantId: "tenant-1" });
    state.stockItems.set("si-1", {
      id: "si-1", tenantId: "tenant-1", productId: "p1", branchId: "b1", quantity: 10,
    });
    const service = createStockService(prisma as never);

    const updated = await service.recordStockMovement({
      tenantId: "tenant-1",
      productId: "p1",
      branchId: "b1",
      movementType: "ADJUSTMENT",
      quantity: 3,
      adjustmentDirection: "IN",
    });

    expect(updated).toMatchObject({ id: "si-1", quantity: 13 });
    expect(state.stockMovements.size).toBe(1);
    const movement = [...state.stockMovements.values()][0]!;
    expect(movement).toMatchObject({
      movementType: "ADJUSTMENT",
      quantity: 3,
    });
  });

  it("creates an ADJUSTMENT_OUT movement and decrements stock balance", async () => {
    const { prisma, state } = createFixture();
    state.products.set("p1", { id: "p1", tenantId: "tenant-1" });
    state.branches.set("b1", { id: "b1", tenantId: "tenant-1" });
    state.stockItems.set("si-1", {
      id: "si-1", tenantId: "tenant-1", productId: "p1", branchId: "b1", quantity: 10,
    });
    const service = createStockService(prisma as never);

    const updated = await service.recordStockMovement({
      tenantId: "tenant-1",
      productId: "p1",
      branchId: "b1",
      movementType: "ADJUSTMENT",
      quantity: 4,
      adjustmentDirection: "OUT",
    });

    expect(updated).toMatchObject({ id: "si-1", quantity: 6 });
    expect(state.stockMovements.size).toBe(1);
    const movement = [...state.stockMovements.values()][0]!;
    expect(movement).toMatchObject({
      movementType: "ADJUSTMENT",
      quantity: -4,
    });
  });

  it("creates a new stock item when none exists", async () => {
    const { prisma, state } = createFixture();
    state.products.set("p1", { id: "p1", tenantId: "tenant-1" });
    state.branches.set("b1", { id: "b1", tenantId: "tenant-1" });
    const service = createStockService(prisma as never);

    const updated = await service.recordStockMovement({
      tenantId: "tenant-1",
      productId: "p1",
      branchId: "b1",
      movementType: "PURCHASE",
      quantity: 5,
    });

    expect(updated).toMatchObject({ tenantId: "tenant-1", productId: "p1", branchId: "b1", quantity: 5 });
    expect(state.stockItems.size).toBe(1);
  });

  it("throws for unsupported movement types", async () => {
    const { prisma, state } = createFixture();
    state.products.set("p1", { id: "p1", tenantId: "tenant-1" });
    state.branches.set("b1", { id: "b1", tenantId: "tenant-1" });
    const service = createStockService(prisma as never);

    await expect(
      service.recordStockMovement({
        tenantId: "tenant-1",
        productId: "p1",
        branchId: "b1",
        movementType: "TRANSFER",
        quantity: 5,
      }),
    ).rejects.toThrow("unsupported movement type");
  });

  it("throws when adjustmentDirection is missing for ADJUSTMENT", async () => {
    const { prisma, state } = createFixture();
    state.products.set("p1", { id: "p1", tenantId: "tenant-1" });
    state.branches.set("b1", { id: "b1", tenantId: "tenant-1" });
    const service = createStockService(prisma as never);

    await expect(
      service.recordStockMovement({
        tenantId: "tenant-1",
        productId: "p1",
        branchId: "b1",
        movementType: "ADJUSTMENT",
        quantity: 5,
      }),
    ).rejects.toThrow("adjustmentDirection is required for ADJUSTMENT movements");
  });

  it("throws when the product belongs to another tenant", async () => {
    const { prisma, state } = createFixture();
    state.products.set("p1", { id: "p1", tenantId: "tenant-2" });
    state.branches.set("b1", { id: "b1", tenantId: "tenant-1" });
    const service = createStockService(prisma as never);

    await expect(
      service.recordStockMovement({
        tenantId: "tenant-1",
        productId: "p1",
        branchId: "b1",
        movementType: "PURCHASE",
        quantity: 5,
      }),
    ).rejects.toThrow("product must belong to the same tenant");
  });

  it("throws when the branch belongs to another tenant", async () => {
    const { prisma, state } = createFixture();
    state.products.set("p1", { id: "p1", tenantId: "tenant-1" });
    state.branches.set("b1", { id: "b1", tenantId: "tenant-2" });
    const service = createStockService(prisma as never);

    await expect(
      service.recordStockMovement({
        tenantId: "tenant-1",
        productId: "p1",
        branchId: "b1",
        movementType: "PURCHASE",
        quantity: 5,
      }),
    ).rejects.toThrow("branch must belong to the same tenant");
  });

  it("throws when SALE would result in negative stock", async () => {
    const { prisma, state } = createFixture();
    state.products.set("p1", { id: "p1", tenantId: "tenant-1" });
    state.branches.set("b1", { id: "b1", tenantId: "tenant-1" });
    state.stockItems.set("si-1", {
      id: "si-1", tenantId: "tenant-1", productId: "p1", branchId: "b1", quantity: 3,
    });
    const service = createStockService(prisma as never);

    await expect(
      service.recordStockMovement({
        tenantId: "tenant-1",
        productId: "p1",
        branchId: "b1",
        movementType: "SALE",
        quantity: 5,
      }),
    ).rejects.toThrow("insufficient stock for this operation");
  });

  it("throws when ADJUSTMENT_OUT would result in negative stock", async () => {
    const { prisma, state } = createFixture();
    state.products.set("p1", { id: "p1", tenantId: "tenant-1" });
    state.branches.set("b1", { id: "b1", tenantId: "tenant-1" });
    state.stockItems.set("si-1", {
      id: "si-1", tenantId: "tenant-1", productId: "p1", branchId: "b1", quantity: 3,
    });
    const service = createStockService(prisma as never);

    await expect(
      service.recordStockMovement({
        tenantId: "tenant-1",
        productId: "p1",
        branchId: "b1",
        movementType: "ADJUSTMENT",
        quantity: 5,
        adjustmentDirection: "OUT",
      }),
    ).rejects.toThrow("insufficient stock for this operation");
  });
});
