import { describe, expect, it, vi } from "vitest";
import { createSupplierService } from "./supplier-service";

describe("supplier service", () => {
  it("creates a supplier within the tenant", async () => {
    const createSupplier = async ({ data }: { data: Record<string, unknown> }) => ({
      id: "supplier-1",
      ...data,
    } as never);

    const supplierService = createSupplierService({
      supplier: {
        create: createSupplier,
        findUnique: async () => null,
        findMany: async () => [],
        update: async ({ data }: { data: Record<string, unknown> }) => ({ id: "supplier-1", ...data }),
      },
    } as never);

    const supplier = await supplierService.createSupplier({
      tenantId: "tenant-1",
      name: "Acme Supplies",
      contactName: "John Doe",
      email: "john@acme.com",
      phone: "1234567890",
      address: "123 Main St",
    });

    expect(supplier.tenantId).toBe("tenant-1");
    expect(supplier.name).toBe("Acme Supplies");
    expect(supplier.contactName).toBe("John Doe");
    expect(supplier.isActive).toBe(true);
  });

  it("defaults optional fields to null and isActive to true", async () => {
    const createSupplier = async ({ data }: { data: Record<string, unknown> }) => ({
      id: "supplier-1",
      ...data,
    } as never);

    const supplierService = createSupplierService({
      supplier: {
        create: createSupplier,
        findUnique: async () => null,
        findMany: async () => [],
        update: async ({ data }: { data: Record<string, unknown> }) => ({ id: "supplier-1", ...data }),
      },
    } as never);

    const supplier = await supplierService.createSupplier({
      tenantId: "tenant-1",
      name: "Basic Supplier",
    });

    expect(supplier.contactName).toBeNull();
    expect(supplier.email).toBeNull();
    expect(supplier.phone).toBeNull();
    expect(supplier.address).toBeNull();
    expect(supplier.isActive).toBe(true);
  });

  it("rejects cross-tenant supplier lookup", async () => {
    const supplierService = createSupplierService({
      supplier: {
        create: async () => ({ id: "supplier-1", tenantId: "tenant-2", name: "Other", contactName: null, email: null, phone: null, address: null, isActive: true, createdAt: new Date(), updatedAt: new Date() }),
        findUnique: async () => ({ id: "supplier-1", tenantId: "tenant-2", name: "Other", contactName: null, email: null, phone: null, address: null, isActive: true, createdAt: new Date(), updatedAt: new Date() }),
        findMany: async () => [],
        update: async () => ({ id: "supplier-1", tenantId: "tenant-2", name: "Other", contactName: null, email: null, phone: null, address: null, isActive: true, createdAt: new Date(), updatedAt: new Date() }),
      },
    } as never);

    const supplier = await supplierService.getSupplier({ tenantId: "tenant-1", supplierId: "supplier-1" });
    expect(supplier).toBeNull();
  });

  it("lists suppliers for the tenant", async () => {
    const supplierService = createSupplierService({
      supplier: {
        create: async () => ({ id: "supplier-1", tenantId: "tenant-1", name: "Main", contactName: null, email: null, phone: null, address: null, isActive: true, createdAt: new Date(), updatedAt: new Date() }),
        findUnique: async () => null,
        findMany: async () => [],
        update: async () => ({ id: "supplier-1", tenantId: "tenant-1", name: "Main", contactName: null, email: null, phone: null, address: null, isActive: true, createdAt: new Date(), updatedAt: new Date() }),
      },
    } as never);

    const suppliers = await supplierService.listSuppliers({ tenantId: "tenant-1" });
    expect(Array.isArray(suppliers)).toBe(true);
  });

  it("updates a supplier within the tenant", async () => {
    const existingSupplier = { id: "supplier-1", tenantId: "tenant-1", name: "Acme Supplies", contactName: "John Doe", email: "john@acme.com", phone: "1234567890", address: "123 Main St", isActive: true, createdAt: new Date(), updatedAt: new Date() };

    const supplierService = createSupplierService({
      supplier: {
        create: async () => existingSupplier,
        findUnique: vi.fn(async () => existingSupplier),
        findMany: async () => [],
        update: async ({ data }: { data: Record<string, unknown> }) => ({ ...existingSupplier, ...data } as never),
      },
    } as never);

    const updated = await supplierService.updateSupplier({
      tenantId: "tenant-1",
      supplierId: "supplier-1",
      input: { name: "Updated Supplier", isActive: false },
    });

    expect(updated.id).toBe("supplier-1");
    expect(updated.isActive).toBe(false);
  });

  it("returns null when updating a missing supplier", async () => {
    const supplierService = createSupplierService({
      supplier: {
        create: async () => ({ id: "supplier-1", tenantId: "tenant-1", name: "Main", contactName: null, email: null, phone: null, address: null, isActive: true, createdAt: new Date(), updatedAt: new Date() }),
        findUnique: async () => null,
        findMany: async () => [],
        update: async () => ({ id: "supplier-1", tenantId: "tenant-1", name: "Main", contactName: null, email: null, phone: null, address: null, isActive: true, createdAt: new Date(), updatedAt: new Date() }),
      },
    } as never);

    const updated = await supplierService.updateSupplier({
      tenantId: "tenant-1",
      supplierId: "missing",
      input: { name: "Missing Supplier" },
    });

    expect(updated).toBeNull();
  });
});
