import { describe, expect, it, vi } from "vitest";
import { createCategoryService } from "./category-service";

function createFixture() {
  type CategoryState = {
    id: string;
    tenantId: string;
    name: string;
    description: string | null;
    isActive: boolean;
  };
  const state = {
    categories: new Map<string, CategoryState>(),
  };
  const prisma = {
    category: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const record = { id: "category-1", ...data } as CategoryState;
        state.categories.set(record.id, record);
        return record;
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        state.categories.get(where.id) ?? null,
      ),
      findMany: vi.fn(async ({ where }: { where?: { tenantId?: string } }) =>
        [...state.categories.values()].filter((c) => c.tenantId === where?.tenantId),
      ),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const existing = state.categories.get(where.id);
        const updated = { ...existing, ...data } as CategoryState;
        state.categories.set(where.id, updated);
        return updated;
      }),
    },
  };
  return { prisma, state };
}

describe("category service: tenant isolation", () => {
  it("lists only categories belonging to the requesting tenant", async () => {
    const { prisma, state } = createFixture();
    state.categories.set("cat-1", {
      id: "cat-1", tenantId: "tenant-1", name: "Retail", description: null, isActive: true,
    });
    state.categories.set("cat-2", {
      id: "cat-2", tenantId: "tenant-2", name: "Wholesale", description: null, isActive: true,
    });
    const service = createCategoryService(prisma as never);

    const categories = await service.listCategories({ tenantId: "tenant-1" });

    expect(categories).toHaveLength(1);
    expect(categories[0]?.id).toBe("cat-1");
  });

  it("returns null when getting a category by ID belonging to another tenant", async () => {
    const { prisma, state } = createFixture();
    state.categories.set("cat-1", {
      id: "cat-1", tenantId: "tenant-2", name: "Retail", description: null, isActive: true,
    });
    const service = createCategoryService(prisma as never);

    const category = await service.getCategory({ tenantId: "tenant-1", categoryId: "cat-1" });

    expect(category).toBeNull();
  });

  it("returns null when getting a non-existent category", async () => {
    const { prisma } = createFixture();
    const service = createCategoryService(prisma as never);

    const category = await service.getCategory({ tenantId: "tenant-1", categoryId: "missing" });

    expect(category).toBeNull();
  });

  it("returns the category when ID belongs to the requesting tenant", async () => {
    const { prisma, state } = createFixture();
    state.categories.set("cat-1", {
      id: "cat-1", tenantId: "tenant-1", name: "Retail", description: null, isActive: true,
    });
    const service = createCategoryService(prisma as never);

    const category = await service.getCategory({ tenantId: "tenant-1", categoryId: "cat-1" });

    expect(category).not.toBeNull();
    expect(category?.id).toBe("cat-1");
  });
});

describe("category service: create and update", () => {
  it("creates a category with the supplied fields", async () => {
    const { prisma } = createFixture();
    const service = createCategoryService(prisma as never);

    const category = await service.createCategory({
      tenantId: "tenant-1",
      name: "Retail",
      description: "Retail products",
      isActive: true,
    });

    expect(category).toMatchObject({
      tenantId: "tenant-1",
      name: "Retail",
      description: "Retail products",
      isActive: true,
    });
  });

  it("updates a category and returns the updated record", async () => {
    const { prisma, state } = createFixture();
    state.categories.set("cat-1", {
      id: "cat-1", tenantId: "tenant-1", name: "Retail", description: null, isActive: true,
    });
    const service = createCategoryService(prisma as never);

    const updated = await service.updateCategory({
      tenantId: "tenant-1",
      categoryId: "cat-1",
      input: { name: "Retail Updated", description: "Updated description" },
    });

    expect(updated).toMatchObject({
      id: "cat-1",
      name: "Retail Updated",
      description: "Updated description",
    });
  });

  it("returns null when updating a non-existent category", async () => {
    const { prisma } = createFixture();
    const service = createCategoryService(prisma as never);

    const updated = await service.updateCategory({
      tenantId: "tenant-1",
      categoryId: "missing",
      input: { name: "Retail" },
    });

    expect(updated).toBeNull();
  });

  it("returns null when updating a category belonging to another tenant", async () => {
    const { prisma, state } = createFixture();
    state.categories.set("cat-1", {
      id: "cat-1", tenantId: "tenant-2", name: "Retail", description: null, isActive: true,
    });
    const service = createCategoryService(prisma as never);

    const updated = await service.updateCategory({
      tenantId: "tenant-1",
      categoryId: "cat-1",
      input: { name: "Retail" },
    });

    expect(updated).toBeNull();
  });
});
