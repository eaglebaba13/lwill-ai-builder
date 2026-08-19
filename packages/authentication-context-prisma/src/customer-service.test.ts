import { describe, expect, it, vi } from "vitest";
import { createCustomerService } from "./customer-service";

function createFixture() {
  type CustomerState = { id: string; tenantId: string; name: string; phone: string | null; email: string | null; notes: string | null; isActive: boolean };
  const state = {
    customers: new Map<string, CustomerState>(),
  };
  const prisma = {
    customer: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const record = { id: "customer-1", ...data } as CustomerState;
        state.customers.set(record.id, record);
        return record;
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        state.customers.get(where.id) ?? null),
      findMany: vi.fn(async ({ where }: { where?: { tenantId?: string } }) =>
        [...state.customers.values()].filter((c) => where?.tenantId === undefined || c.tenantId === where.tenantId)),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const existing = state.customers.get(where.id);
        const updated = { ...existing, ...data } as CustomerState;
        state.customers.set(where.id, updated);
        return updated;
      }),
      delete: vi.fn(),
    },
  };
  return { prisma, state };
}

describe("customer service (list/update)", () => {
  it("lists only customers belonging to the requesting tenant", async () => {
    const { prisma, state } = createFixture();
    state.customers.set("customer-1", {
      id: "customer-1", tenantId: "tenant-1", name: "Jane", phone: null, email: null, notes: null, isActive: true,
    });
    state.customers.set("customer-2", {
      id: "customer-2", tenantId: "tenant-2", name: "John", phone: null, email: null, notes: null, isActive: true,
    });
    const service = createCustomerService(prisma as never);

    const customers = await service.listCustomers({ tenantId: "tenant-1" });

    expect(customers).toHaveLength(1);
    expect(customers[0]?.id).toBe("customer-1");
  });

  it("updates a customer belonging to the same tenant", async () => {
    const { prisma, state } = createFixture();
    state.customers.set("customer-1", {
      id: "customer-1", tenantId: "tenant-1", name: "Jane", phone: null, email: null, notes: null, isActive: true,
    });
    const service = createCustomerService(prisma as never);

    const updated = await service.updateCustomer({
      tenantId: "tenant-1",
      customerId: "customer-1",
      input: { name: "Jane Doe", isActive: false },
    });

    expect(updated?.name).toBe("Jane Doe");
    expect(updated?.isActive).toBe(false);
  });

  it("rejects cross-tenant update and returns null", async () => {
    const { prisma, state } = createFixture();
    state.customers.set("customer-1", {
      id: "customer-1", tenantId: "tenant-2", name: "Jane", phone: null, email: null, notes: null, isActive: true,
    });
    const service = createCustomerService(prisma as never);

    const updated = await service.updateCustomer({
      tenantId: "tenant-1",
      customerId: "customer-1",
      input: { name: "Hijacked" },
    });

    expect(updated).toBeNull();
    expect(prisma.customer.update).not.toHaveBeenCalled();
  });

  it("returns null when updating a non-existent customer", async () => {
    const { prisma } = createFixture();
    const service = createCustomerService(prisma as never);

    const updated = await service.updateCustomer({
      tenantId: "tenant-1",
      customerId: "missing",
      input: { name: "Nobody" },
    });

    expect(updated).toBeNull();
  });
});
