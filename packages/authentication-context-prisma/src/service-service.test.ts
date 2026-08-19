import { describe, expect, it, vi } from "vitest";
import { createServiceService } from "./service-service";

function createFixture() {
  type ServiceState = {
    id: string;
    tenantId: string;
    name: string;
    durationMinutes: number;
    priceCents: number;
    description: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  const state = {
    services: new Map<string, ServiceState>(),
  };
  let nextId = 1;
  const prisma = {
    service: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const id = `service-${nextId++}`;
        const record = { id, createdAt: new Date(), updatedAt: new Date(), ...data } as ServiceState;
        state.services.set(record.id, record);
        return record;
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        state.services.get(where.id) ?? null,
      ),
      findMany: vi.fn(async ({ where }: { where?: { tenantId?: string } }) =>
        [...state.services.values()].filter(
          (s) => where?.tenantId === undefined || s.tenantId === where.tenantId,
        ),
      ),
      update: vi.fn(
        async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          const existing = state.services.get(where.id);
          const updated = { ...existing, ...data } as ServiceState;
          state.services.set(where.id, updated);
          return updated;
        },
      ),
      delete: vi.fn(),
    },
  };
  return { prisma, state };
}

describe("service service", () => {
  // --- createService ---

  it("creates a service with valid input", async () => {
    const { prisma } = createFixture();
    const service = createServiceService(prisma as never);

    const result = await service.createService({
      tenantId: "tenant-1",
      name: "Haircut",
      durationMinutes: 30,
      priceCents: 2500,
    });

    expect(result.tenantId).toBe("tenant-1");
    expect(result.name).toBe("Haircut");
    expect(result.durationMinutes).toBe(30);
    expect(result.priceCents).toBe(2500);
    expect(result.isActive).toBe(true);
  });

  it("rejects createService with blank name", async () => {
    const { prisma } = createFixture();
    const service = createServiceService(prisma as never);

    await expect(
      service.createService({
        tenantId: "tenant-1",
        name: "   ",
        durationMinutes: 30,
        priceCents: 2500,
      }),
    ).rejects.toThrow("service name is required");
  });

  it("rejects createService with zero durationMinutes", async () => {
    const { prisma } = createFixture();
    const service = createServiceService(prisma as never);

    await expect(
      service.createService({
        tenantId: "tenant-1",
        name: "Haircut",
        durationMinutes: 0,
        priceCents: 2500,
      }),
    ).rejects.toThrow("service duration must be a positive whole number of minutes");
  });

  it("rejects createService with negative durationMinutes", async () => {
    const { prisma } = createFixture();
    const service = createServiceService(prisma as never);

    await expect(
      service.createService({
        tenantId: "tenant-1",
        name: "Haircut",
        durationMinutes: -5,
        priceCents: 2500,
      }),
    ).rejects.toThrow("service duration must be a positive whole number of minutes");
  });

  it("rejects createService with non-integer durationMinutes", async () => {
    const { prisma } = createFixture();
    const service = createServiceService(prisma as never);

    await expect(
      service.createService({
        tenantId: "tenant-1",
        name: "Haircut",
        durationMinutes: 1.5,
        priceCents: 2500,
      }),
    ).rejects.toThrow("service duration must be a positive whole number of minutes");
  });

  it("rejects createService with negative priceCents", async () => {
    const { prisma } = createFixture();
    const service = createServiceService(prisma as never);

    await expect(
      service.createService({
        tenantId: "tenant-1",
        name: "Haircut",
        durationMinutes: 30,
        priceCents: -100,
      }),
    ).rejects.toThrow("service price must be a non-negative whole number of cents");
  });

  it("rejects createService with non-integer priceCents", async () => {
    const { prisma } = createFixture();
    const service = createServiceService(prisma as never);

    await expect(
      service.createService({
        tenantId: "tenant-1",
        name: "Haircut",
        durationMinutes: 30,
        priceCents: 9.99,
      }),
    ).rejects.toThrow("service price must be a non-negative whole number of cents");
  });

  // --- getService ---

  it("returns the correct tenant service via getService", async () => {
    const { prisma, state } = createFixture();
    state.services.set("svc-1", {
      id: "svc-1",
      tenantId: "tenant-1",
      name: "Manicure",
      durationMinutes: 45,
      priceCents: 3000,
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const service = createServiceService(prisma as never);

    const result = await service.getService({ tenantId: "tenant-1", serviceId: "svc-1" });

    expect(result).not.toBeNull();
    expect(result?.id).toBe("svc-1");
    expect(result?.name).toBe("Manicure");
  });

  it("returns null for cross-tenant getService", async () => {
    const { prisma, state } = createFixture();
    state.services.set("svc-1", {
      id: "svc-1",
      tenantId: "tenant-2",
      name: "Manicure",
      durationMinutes: 45,
      priceCents: 3000,
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const service = createServiceService(prisma as never);

    const result = await service.getService({ tenantId: "tenant-1", serviceId: "svc-1" });

    expect(result).toBeNull();
  });

  // --- listServices ---

  it("lists only services belonging to the requesting tenant", async () => {
    const { prisma, state } = createFixture();
    state.services.set("svc-1", {
      id: "svc-1",
      tenantId: "tenant-1",
      name: "Haircut",
      durationMinutes: 30,
      priceCents: 2500,
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    state.services.set("svc-2", {
      id: "svc-2",
      tenantId: "tenant-2",
      name: "Massage",
      durationMinutes: 60,
      priceCents: 5000,
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const service = createServiceService(prisma as never);

    const results = await service.listServices({ tenantId: "tenant-1" });

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe("svc-1");
  });

  it("returns empty array when no services exist for tenant", async () => {
    const { prisma, state } = createFixture();
    state.services.set("svc-1", {
      id: "svc-1",
      tenantId: "tenant-2",
      name: "Massage",
      durationMinutes: 60,
      priceCents: 5000,
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const service = createServiceService(prisma as never);

    const results = await service.listServices({ tenantId: "tenant-1" });

    expect(results).toHaveLength(0);
  });

  // --- updateService ---

  it("updates valid supplied fields (name, durationMinutes, priceCents)", async () => {
    const { prisma, state } = createFixture();
    state.services.set("svc-1", {
      id: "svc-1",
      tenantId: "tenant-1",
      name: "Haircut",
      durationMinutes: 30,
      priceCents: 2500,
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const service = createServiceService(prisma as never);

    const updated = await service.updateService({
      tenantId: "tenant-1",
      serviceId: "svc-1",
      input: { name: "Premium Haircut", durationMinutes: 45, priceCents: 3500 },
    });

    expect(updated).not.toBeNull();
    expect(updated?.name).toBe("Premium Haircut");
    expect(updated?.durationMinutes).toBe(45);
    expect(updated?.priceCents).toBe(3500);
  });

  it("preserves unspecified fields during partial update", async () => {
    const { prisma, state } = createFixture();
    state.services.set("svc-1", {
      id: "svc-1",
      tenantId: "tenant-1",
      name: "Haircut",
      durationMinutes: 30,
      priceCents: 2500,
      description: "Quick trim",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const service = createServiceService(prisma as never);

    const updated = await service.updateService({
      tenantId: "tenant-1",
      serviceId: "svc-1",
      input: { name: "Deluxe Haircut" },
    });

    expect(updated).not.toBeNull();
    expect(updated?.name).toBe("Deluxe Haircut");
    expect(updated?.durationMinutes).toBe(30);
    expect(updated?.priceCents).toBe(2500);
    expect(updated?.description).toBe("Quick trim");
  });

  it("returns null when updating a nonexistent service", async () => {
    const { prisma } = createFixture();
    const service = createServiceService(prisma as never);

    const updated = await service.updateService({
      tenantId: "tenant-1",
      serviceId: "missing",
      input: { name: "Nobody" },
    });

    expect(updated).toBeNull();
  });

  it("returns null for cross-tenant updateService", async () => {
    const { prisma, state } = createFixture();
    state.services.set("svc-1", {
      id: "svc-1",
      tenantId: "tenant-2",
      name: "Haircut",
      durationMinutes: 30,
      priceCents: 2500,
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const service = createServiceService(prisma as never);

    const updated = await service.updateService({
      tenantId: "tenant-1",
      serviceId: "svc-1",
      input: { name: "Hijacked" },
    });

    expect(updated).toBeNull();
    expect(prisma.service.update).not.toHaveBeenCalled();
  });

  it("rejects updateService with blank name", async () => {
    const { prisma, state } = createFixture();
    state.services.set("svc-1", {
      id: "svc-1",
      tenantId: "tenant-1",
      name: "Haircut",
      durationMinutes: 30,
      priceCents: 2500,
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const service = createServiceService(prisma as never);

    await expect(
      service.updateService({
        tenantId: "tenant-1",
        serviceId: "svc-1",
        input: { name: "   " },
      }),
    ).rejects.toThrow("service name is required");
  });

  it("rejects updateService with zero durationMinutes", async () => {
    const { prisma, state } = createFixture();
    state.services.set("svc-1", {
      id: "svc-1",
      tenantId: "tenant-1",
      name: "Haircut",
      durationMinutes: 30,
      priceCents: 2500,
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const service = createServiceService(prisma as never);

    await expect(
      service.updateService({
        tenantId: "tenant-1",
        serviceId: "svc-1",
        input: { durationMinutes: 0 },
      }),
    ).rejects.toThrow("service duration must be a positive whole number of minutes");
  });

  it("rejects updateService with negative durationMinutes", async () => {
    const { prisma, state } = createFixture();
    state.services.set("svc-1", {
      id: "svc-1",
      tenantId: "tenant-1",
      name: "Haircut",
      durationMinutes: 30,
      priceCents: 2500,
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const service = createServiceService(prisma as never);

    await expect(
      service.updateService({
        tenantId: "tenant-1",
        serviceId: "svc-1",
        input: { durationMinutes: -10 },
      }),
    ).rejects.toThrow("service duration must be a positive whole number of minutes");
  });

  it("rejects updateService with non-integer durationMinutes", async () => {
    const { prisma, state } = createFixture();
    state.services.set("svc-1", {
      id: "svc-1",
      tenantId: "tenant-1",
      name: "Haircut",
      durationMinutes: 30,
      priceCents: 2500,
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const service = createServiceService(prisma as never);

    await expect(
      service.updateService({
        tenantId: "tenant-1",
        serviceId: "svc-1",
        input: { durationMinutes: 2.5 },
      }),
    ).rejects.toThrow("service duration must be a positive whole number of minutes");
  });

  it("rejects updateService with negative priceCents", async () => {
    const { prisma, state } = createFixture();
    state.services.set("svc-1", {
      id: "svc-1",
      tenantId: "tenant-1",
      name: "Haircut",
      durationMinutes: 30,
      priceCents: 2500,
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const service = createServiceService(prisma as never);

    await expect(
      service.updateService({
        tenantId: "tenant-1",
        serviceId: "svc-1",
        input: { priceCents: -500 },
      }),
    ).rejects.toThrow("service price must be a non-negative whole number of cents");
  });

  it("rejects updateService with non-integer priceCents", async () => {
    const { prisma, state } = createFixture();
    state.services.set("svc-1", {
      id: "svc-1",
      tenantId: "tenant-1",
      name: "Haircut",
      durationMinutes: 30,
      priceCents: 2500,
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const service = createServiceService(prisma as never);

    await expect(
      service.updateService({
        tenantId: "tenant-1",
        serviceId: "svc-1",
        input: { priceCents: 9.99 },
      }),
    ).rejects.toThrow("service price must be a non-negative whole number of cents");
  });

  it("verifies tenantId cannot be changed through update input", async () => {
    const { prisma, state } = createFixture();
    state.services.set("svc-1", {
      id: "svc-1",
      tenantId: "tenant-1",
      name: "Haircut",
      durationMinutes: 30,
      priceCents: 2500,
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const service = createServiceService(prisma as never);

    // The updateService input type does not include tenantId,
    // so we verify the original tenantId is preserved after update
    const updated = await service.updateService({
      tenantId: "tenant-1",
      serviceId: "svc-1",
      input: { name: "Updated Haircut" },
    });

    expect(updated).not.toBeNull();
    expect(updated?.tenantId).toBe("tenant-1");
    // Also verify the state still has the original tenantId
    const stored = state.services.get("svc-1");
    expect(stored?.tenantId).toBe("tenant-1");
  });
});
