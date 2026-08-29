import { describe, expect, it, vi } from "vitest";
import { createWarehouseService } from "./warehouse-service";

describe("warehouse service", () => {
  it("creates a warehouse within the tenant", async () => {
    const createWarehouse = async ({ data }: { data: Record<string, unknown> }) => ({
      id: "warehouse-1",
      ...data,
    } as never);

    const warehouseService = createWarehouseService({
      warehouse: {
        create: createWarehouse,
        findUnique: async () => null,
        findMany: async () => [],
        update: async ({ data }: { data: Record<string, unknown> }) => ({ id: "warehouse-1", ...data }),
      },
    } as never);

    const warehouse = await warehouseService.createWarehouse({
      tenantId: "tenant-1",
      name: "Main Warehouse",
      location: "Floor 1",
    });

    expect(warehouse.tenantId).toBe("tenant-1");
    expect(warehouse.name).toBe("Main Warehouse");
    expect(warehouse.location).toBe("Floor 1");
    expect(warehouse.isActive).toBe(true);
  });

  it("defaults location to null and isActive to true", async () => {
    const createWarehouse = async ({ data }: { data: Record<string, unknown> }) => ({
      id: "warehouse-1",
      ...data,
    } as never);

    const warehouseService = createWarehouseService({
      warehouse: {
        create: createWarehouse,
        findUnique: async () => null,
        findMany: async () => [],
        update: async ({ data }: { data: Record<string, unknown> }) => ({ id: "warehouse-1", ...data }),
      },
    } as never);

    const warehouse = await warehouseService.createWarehouse({
      tenantId: "tenant-1",
      name: "Secondary Warehouse",
    });

    expect(warehouse.location).toBeNull();
    expect(warehouse.isActive).toBe(true);
  });

  it("rejects cross-tenant warehouse lookup", async () => {
    const warehouseService = createWarehouseService({
      warehouse: {
        create: async () => ({ id: "warehouse-1", tenantId: "tenant-2", name: "Other", location: null, isActive: true, createdAt: new Date(), updatedAt: new Date() }),
        findUnique: async () => ({ id: "warehouse-1", tenantId: "tenant-2", name: "Other", location: null, isActive: true, createdAt: new Date(), updatedAt: new Date() }),
        findMany: async () => [],
        update: async () => ({ id: "warehouse-1", tenantId: "tenant-2", name: "Other", location: null, isActive: true, createdAt: new Date(), updatedAt: new Date() }),
      },
    } as never);

    const warehouse = await warehouseService.getWarehouse({ tenantId: "tenant-1", warehouseId: "warehouse-1" });
    expect(warehouse).toBeNull();
  });

  it("lists warehouses for the tenant", async () => {
    const warehouseService = createWarehouseService({
      warehouse: {
        create: async () => ({ id: "warehouse-1", tenantId: "tenant-1", name: "Main", location: null, isActive: true, createdAt: new Date(), updatedAt: new Date() }),
        findUnique: async () => null,
        findMany: async () => [],
        update: async () => ({ id: "warehouse-1", tenantId: "tenant-1", name: "Main", location: null, isActive: true, createdAt: new Date(), updatedAt: new Date() }),
      },
    } as never);

    const warehouses = await warehouseService.listWarehouses({ tenantId: "tenant-1" });
    expect(Array.isArray(warehouses)).toBe(true);
  });

  it("updates a warehouse within the tenant", async () => {
    const existingWarehouse = { id: "warehouse-1", tenantId: "tenant-1", name: "Main Warehouse", location: "Floor 1", isActive: true, createdAt: new Date(), updatedAt: new Date() };

    const warehouseService = createWarehouseService({
      warehouse: {
        create: async () => existingWarehouse,
        findUnique: vi.fn(async () => existingWarehouse),
        findMany: async () => [],
        update: async ({ data }: { data: Record<string, unknown> }) => ({ ...existingWarehouse, ...data } as never),
      },
    } as never);

    const updated = await warehouseService.updateWarehouse({
      tenantId: "tenant-1",
      warehouseId: "warehouse-1",
      input: { name: "Updated Warehouse", isActive: false },
    });

    expect(updated.id).toBe("warehouse-1");
    expect(updated.isActive).toBe(false);
  });

  it("returns null when updating a missing warehouse", async () => {
    const warehouseService = createWarehouseService({
      warehouse: {
        create: async () => ({ id: "warehouse-1", tenantId: "tenant-1", name: "Main", location: null, isActive: true, createdAt: new Date(), updatedAt: new Date() }),
        findUnique: async () => null,
        findMany: async () => [],
        update: async () => ({ id: "warehouse-1", tenantId: "tenant-1", name: "Main", location: null, isActive: true, createdAt: new Date(), updatedAt: new Date() }),
      },
    } as never);

    const updated = await warehouseService.updateWarehouse({
      tenantId: "tenant-1",
      warehouseId: "missing",
      input: { name: "Missing Warehouse" },
    });

    expect(updated).toBeNull();
  });
});
