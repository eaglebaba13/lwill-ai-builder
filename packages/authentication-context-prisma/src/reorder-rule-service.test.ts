import { describe, expect, it, vi } from "vitest";
import { createReorderRuleService } from "./reorder-rule-service";

describe("reorder rule service", () => {
  const createReorderRule = async ({ data }: { data: Record<string, unknown> }) => ({
    id: "reorder-rule-1",
    ...data,
  } as never);

  const reorderRuleService = createReorderRuleService({
    reorderRule: {
      create: createReorderRule,
      findUnique: async () => null,
      findMany: async () => [],
      update: async ({ data }: { data: Record<string, unknown> }) => ({ id: "reorder-rule-1", ...data }),
    },
    product: {
      findUnique: async () => ({ id: "product-1", tenantId: "tenant-1" }),
    },
    branch: {
      findUnique: async () => ({ id: "branch-1", tenantId: "tenant-1" }),
    },
    warehouse: {
      findUnique: async () => ({ id: "warehouse-1", tenantId: "tenant-1" }),
    },
  } as never);

  it("creates a reorder rule within the tenant", async () => {
    const rule = await reorderRuleService.createReorderRule({
      tenantId: "tenant-1",
      productId: "product-1",
      branchId: "branch-1",
      warehouseId: "warehouse-1",
      minQuantity: 10,
      reorderQuantity: 50,
    });

    expect(rule.tenantId).toBe("tenant-1");
    expect(rule.productId).toBe("product-1");
    expect(rule.minQuantity).toBe(10);
    expect(rule.reorderQuantity).toBe(50);
    expect(rule.isActive).toBe(true);
  });

  it("rejects cross-tenant product lookup", async () => {
    const service = createReorderRuleService({
      reorderRule: {
        create: async () => ({ id: "reorder-rule-1", tenantId: "tenant-1", productId: "product-1", branchId: "branch-1", warehouseId: "warehouse-1", minQuantity: 10, reorderQuantity: 50, isActive: true, createdAt: new Date(), updatedAt: new Date() }),
        findUnique: async () => null,
        findMany: async () => [],
        update: async () => ({ id: "reorder-rule-1", tenantId: "tenant-1", productId: "product-1", branchId: "branch-1", warehouseId: "warehouse-1", minQuantity: 10, reorderQuantity: 50, isActive: true, createdAt: new Date(), updatedAt: new Date() }),
      },
      product: {
        findUnique: async () => ({ id: "product-1", tenantId: "tenant-2" }),
      },
      branch: {
        findUnique: async () => ({ id: "branch-1", tenantId: "tenant-1" }),
      },
      warehouse: {
        findUnique: async () => ({ id: "warehouse-1", tenantId: "tenant-1" }),
      },
    } as never);

    await expect(service.createReorderRule({
      tenantId: "tenant-1",
      productId: "product-1",
      branchId: "branch-1",
      warehouseId: "warehouse-1",
      minQuantity: 10,
      reorderQuantity: 50,
    })).rejects.toThrow("product must belong to the same tenant");
  });

  it("lists reorder rules for the tenant", async () => {
    const service = createReorderRuleService({
      reorderRule: {
        create: async () => ({ id: "reorder-rule-1", tenantId: "tenant-1", productId: "product-1", branchId: "branch-1", warehouseId: "warehouse-1", minQuantity: 10, reorderQuantity: 50, isActive: true, createdAt: new Date(), updatedAt: new Date() }),
        findUnique: async () => null,
        findMany: async () => [],
        update: async () => ({ id: "reorder-rule-1", tenantId: "tenant-1", productId: "product-1", branchId: "branch-1", warehouseId: "warehouse-1", minQuantity: 10, reorderQuantity: 50, isActive: true, createdAt: new Date(), updatedAt: new Date() }),
      },
      product: {
        findUnique: async () => ({ id: "product-1", tenantId: "tenant-1" }),
      },
      branch: {
        findUnique: async () => ({ id: "branch-1", tenantId: "tenant-1" }),
      },
      warehouse: {
        findUnique: async () => ({ id: "warehouse-1", tenantId: "tenant-1" }),
      },
    } as never);

    const rules = await service.listReorderRules({ tenantId: "tenant-1" });
    expect(Array.isArray(rules)).toBe(true);
  });

  it("updates a reorder rule within the tenant", async () => {
    const existingRule = { id: "reorder-rule-1", tenantId: "tenant-1", productId: "product-1", branchId: "branch-1", warehouseId: "warehouse-1", minQuantity: 10, reorderQuantity: 50, isActive: true, createdAt: new Date(), updatedAt: new Date() };

    const service = createReorderRuleService({
      reorderRule: {
        create: async () => existingRule,
        findUnique: vi.fn(async () => existingRule),
        findMany: async () => [],
        update: async ({ data }: { data: Record<string, unknown> }) => ({ ...existingRule, ...data } as never),
      },
      product: {
        findUnique: async () => ({ id: "product-1", tenantId: "tenant-1" }),
      },
      branch: {
        findUnique: async () => ({ id: "branch-1", tenantId: "tenant-1" }),
      },
      warehouse: {
        findUnique: async () => ({ id: "warehouse-1", tenantId: "tenant-1" }),
      },
    } as never);

    const updated = await service.updateReorderRule({
      tenantId: "tenant-1",
      reorderRuleId: "reorder-rule-1",
      input: { minQuantity: 20, isActive: false },
    });

    expect(updated.id).toBe("reorder-rule-1");
    expect(updated.minQuantity).toBe(20);
    expect(updated.isActive).toBe(false);
  });

  it("returns null when updating a missing reorder rule", async () => {
    const service = createReorderRuleService({
      reorderRule: {
        create: async () => ({ id: "reorder-rule-1", tenantId: "tenant-1", productId: "product-1", branchId: "branch-1", warehouseId: "warehouse-1", minQuantity: 10, reorderQuantity: 50, isActive: true, createdAt: new Date(), updatedAt: new Date() }),
        findUnique: async () => null,
        findMany: async () => [],
        update: async () => ({ id: "reorder-rule-1", tenantId: "tenant-1", productId: "product-1", branchId: "branch-1", warehouseId: "warehouse-1", minQuantity: 10, reorderQuantity: 50, isActive: true, createdAt: new Date(), updatedAt: new Date() }),
      },
      product: {
        findUnique: async () => ({ id: "product-1", tenantId: "tenant-1" }),
      },
      branch: {
        findUnique: async () => ({ id: "branch-1", tenantId: "tenant-1" }),
      },
      warehouse: {
        findUnique: async () => ({ id: "warehouse-1", tenantId: "tenant-1" }),
      },
    } as never);

    const updated = await service.updateReorderRule({
      tenantId: "tenant-1",
      reorderRuleId: "missing",
      input: { minQuantity: 20 },
    });

    expect(updated).toBeNull();
  });
});
