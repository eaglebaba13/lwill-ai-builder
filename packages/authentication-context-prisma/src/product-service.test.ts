import { describe, expect, it, vi } from "vitest";
import { createProductService } from "./product-service";

function createFixture() {
  type ProductState = {
    id: string;
    tenantId: string;
    categoryId: string;
    name: string;
    sku: string;
    unit: string;
    priceCents: number;
    isActive: boolean;
  };
  const state = {
    products: new Map<string, ProductState>(),
    categories: new Map<string, { id: string; tenantId: string }>(),
  };
  const prisma = {
    product: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const record = { id: "product-1", ...data } as ProductState;
        state.products.set(record.id, record);
        return record;
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        state.products.get(where.id) ?? null,
      ),
      findMany: vi.fn(async ({ where }: { where?: { tenantId?: string } }) =>
        [...state.products.values()].filter((p) => p.tenantId === where?.tenantId),
      ),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const existing = state.products.get(where.id);
        const updated = { ...existing, ...data } as ProductState;
        state.products.set(where.id, updated);
        return updated;
      }),
    },
    category: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        state.categories.get(where.id) ?? null,
      ),
    },
  };
  return { prisma, state };
}

describe("product service: tenant isolation", () => {
  it("lists only products belonging to the requesting tenant", async () => {
    const { prisma, state } = createFixture();
    state.products.set("p1", {
      id: "p1", tenantId: "tenant-1", categoryId: "cat-1", name: "Nail Polish", sku: "NP-001", unit: "ml", priceCents: 1500, isActive: true,
    });
    state.products.set("p2", {
      id: "p2", tenantId: "tenant-2", categoryId: "cat-2", name: "Cream", sku: "CR-001", unit: "ml", priceCents: 2000, isActive: true,
    });
    const service = createProductService(prisma as never);

    const products = await service.listProducts({ tenantId: "tenant-1" });

    expect(products).toHaveLength(1);
    expect(products[0]?.id).toBe("p1");
  });

  it("returns null when getting a product by ID belonging to another tenant", async () => {
    const { prisma, state } = createFixture();
    state.products.set("p1", {
      id: "p1", tenantId: "tenant-2", categoryId: "cat-1", name: "Nail Polish", sku: "NP-001", unit: "ml", priceCents: 1500, isActive: true,
    });
    const service = createProductService(prisma as never);

    const product = await service.getProduct({ tenantId: "tenant-1", productId: "p1" });

    expect(product).toBeNull();
  });

  it("returns null when getting a non-existent product", async () => {
    const { prisma } = createFixture();
    const service = createProductService(prisma as never);

    const product = await service.getProduct({ tenantId: "tenant-1", productId: "missing" });

    expect(product).toBeNull();
  });

  it("returns the product when ID belongs to the requesting tenant", async () => {
    const { prisma, state } = createFixture();
    state.products.set("p1", {
      id: "p1", tenantId: "tenant-1", categoryId: "cat-1", name: "Nail Polish", sku: "NP-001", unit: "ml", priceCents: 1500, isActive: true,
    });
    const service = createProductService(prisma as never);

    const product = await service.getProduct({ tenantId: "tenant-1", productId: "p1" });

    expect(product).not.toBeNull();
    expect(product?.id).toBe("p1");
  });
});

describe("product service: create and update", () => {
  it("creates a product for a valid category in the same tenant", async () => {
    const { prisma, state } = createFixture();
    state.categories.set("cat-1", { id: "cat-1", tenantId: "tenant-1" });
    const service = createProductService(prisma as never);

    const product = await service.createProduct({
      tenantId: "tenant-1",
      categoryId: "cat-1",
      name: "Nail Polish",
      sku: "NP-001",
      unit: "ml",
      priceCents: 1500,
      isActive: true,
    });

    expect(product).toMatchObject({
      tenantId: "tenant-1",
      categoryId: "cat-1",
      name: "Nail Polish",
      sku: "NP-001",
      unit: "ml",
      priceCents: 1500,
      isActive: true,
    });
  });

  it("throws when the category belongs to another tenant", async () => {
    const { prisma, state } = createFixture();
    state.categories.set("cat-1", { id: "cat-1", tenantId: "tenant-2" });
    const service = createProductService(prisma as never);

    await expect(
      service.createProduct({
        tenantId: "tenant-1",
        categoryId: "cat-1",
        name: "Nail Polish",
        sku: "NP-001",
        priceCents: 1500,
      }),
    ).rejects.toThrow("category must belong to the same tenant");
  });

  it("updates a product and returns the updated record", async () => {
    const { prisma, state } = createFixture();
    state.products.set("p1", {
      id: "p1", tenantId: "tenant-1", categoryId: "cat-1", name: "Nail Polish", sku: "NP-001", unit: "ml", priceCents: 1500, isActive: true,
    });
    state.categories.set("cat-2", { id: "cat-2", tenantId: "tenant-1" });
    const service = createProductService(prisma as never);

    const updated = await service.updateProduct({
      tenantId: "tenant-1",
      productId: "p1",
      input: { name: "New Nail Polish", priceCents: 2000 },
    });

    expect(updated).toMatchObject({
      id: "p1",
      name: "New Nail Polish",
      priceCents: 2000,
    });
  });

  it("returns null when updating a non-existent product", async () => {
    const { prisma } = createFixture();
    const service = createProductService(prisma as never);

    const updated = await service.updateProduct({
      tenantId: "tenant-1",
      productId: "missing",
      input: { name: "Nail Polish" },
    });

    expect(updated).toBeNull();
  });

  it("returns null when updating a product belonging to another tenant", async () => {
    const { prisma, state } = createFixture();
    state.products.set("p1", {
      id: "p1", tenantId: "tenant-2", categoryId: "cat-1", name: "Nail Polish", sku: "NP-001", unit: "ml", priceCents: 1500, isActive: true,
    });
    const service = createProductService(prisma as never);

    const updated = await service.updateProduct({
      tenantId: "tenant-1",
      productId: "p1",
      input: { name: "Nail Polish" },
    });

    expect(updated).toBeNull();
  });

  it("throws when updating category to one belonging to another tenant", async () => {
    const { prisma, state } = createFixture();
    state.products.set("p1", {
      id: "p1", tenantId: "tenant-1", categoryId: "cat-1", name: "Nail Polish", sku: "NP-001", unit: "ml", priceCents: 1500, isActive: true,
    });
    state.categories.set("cat-2", { id: "cat-2", tenantId: "tenant-2" });
    const service = createProductService(prisma as never);

    await expect(
      service.updateProduct({
        tenantId: "tenant-1",
        productId: "p1",
        input: { categoryId: "cat-2" },
      }),
    ).rejects.toThrow("category must belong to the same tenant");
  });
});
