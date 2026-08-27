import { describe, expect, it, vi } from "vitest";
import { createPackageService } from "./package-service";
import { createMembershipService } from "./membership-service";

function createPackageFixture() {
  type PackageState = {
    id: string;
    tenantId: string;
    name: string;
    serviceIds: string[];
    priceCents: number | null;
    durationDays: number | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  const state = {
    packages: new Map<string, PackageState>(),
  };
  let nextId = 1;
  const prisma = {
    package: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const id = `pkg-${nextId++}`;
        const record = { id, createdAt: new Date(), updatedAt: new Date(), ...data } as PackageState;
        state.packages.set(record.id, record);
        return record;
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        state.packages.get(where.id) ?? null,
      ),
      findMany: vi.fn(async ({ where }: { where?: { tenantId?: string } }) =>
        [...state.packages.values()].filter(
          (p) => where?.tenantId === undefined || p.tenantId === where.tenantId,
        ),
      ),
      update: vi.fn(
        async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          const existing = state.packages.get(where.id);
          const updated = { ...existing, ...data, updatedAt: new Date() } as PackageState;
          state.packages.set(where.id, updated);
          return updated;
        },
      ),
    },
    service: {
      findUnique: vi.fn(async () => ({ id: "service-1", tenantId: "tenant-1" })),
    },
  };
  return { prisma, state };
}

describe("package and membership services", () => {
  it("creates a package within the tenant and links services", async () => {
    const packageService = createPackageService({
      package: {
        create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "pkg-1", ...data }),
        findUnique: async () => null,
        findMany: async () => [],
      },
      service: {
        findUnique: async () => ({ id: "service-1", tenantId: "tenant-1" }),
      },
    } as never);

    const pkg = await packageService.createPackage({
      tenantId: "tenant-1",
      name: "Glow Facial",
      serviceIds: ["service-1"],
      priceCents: 12000,
      durationDays: 30,
      isActive: true,
    });

    expect(pkg.tenantId).toBe("tenant-1");
    expect(pkg.name).toBe("Glow Facial");
    expect(pkg.serviceIds).toEqual(["service-1"]);
  });

  it("rejects a package when a service belongs to another tenant", async () => {
    const packageService = createPackageService({
      package: {
        create: async () => ({ id: "pkg-1" }),
        findUnique: async () => null,
        findMany: async () => [],
      },
      service: {
        findUnique: async () => ({ id: "service-1", tenantId: "tenant-2" }),
      },
    } as never);

    await expect(
      packageService.createPackage({
        tenantId: "tenant-1",
        name: "Glow Facial",
        serviceIds: ["service-1"],
      }),
    ).rejects.toThrow("service must belong to the same tenant");
  });

  it("creates a membership for a customer with a package in the same tenant", async () => {
    const membershipService = createMembershipService({
      membership: {
        create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "membership-1", ...data }),
        findUnique: async () => null,
        findMany: async () => [],
      },
      customer: {
        findUnique: async () => ({ id: "customer-1", tenantId: "tenant-1" }),
      },
      package: {
        findUnique: async () => ({ id: "pkg-1", tenantId: "tenant-1" }),
      },
    } as never);

    const membership = await membershipService.createMembership({
      tenantId: "tenant-1",
      customerId: "customer-1",
      packageId: "pkg-1",
      startedAt: new Date("2026-08-12T00:00:00.000Z"),
      endsAt: new Date("2026-09-12T00:00:00.000Z"),
      status: "active",
    });

    expect(membership.tenantId).toBe("tenant-1");
    expect(membership.status).toBe("active");
  });

  it("rejects a membership when the customer or package belongs to another tenant", async () => {
    const membershipService = createMembershipService({
      membership: {
        create: async () => ({ id: "membership-1" }),
        findUnique: async () => null,
        findMany: async () => [],
      },
      customer: {
        findUnique: async () => ({ id: "customer-1", tenantId: "tenant-2" }),
      },
      package: {
        findUnique: async () => ({ id: "pkg-1", tenantId: "tenant-1" }),
      },
    } as never);

    await expect(
      membershipService.createMembership({
        tenantId: "tenant-1",
        customerId: "customer-1",
        packageId: "pkg-1",
        startedAt: new Date("2026-08-12T00:00:00.000Z"),
        endsAt: new Date("2026-09-12T00:00:00.000Z"),
      }),
    ).rejects.toThrow("customer and package must belong to the same tenant");
  });
});

describe("package service: updatePackage", () => {
  it("updates valid supplied fields and preserves unspecified fields", async () => {
    const { prisma, state } = createPackageFixture();
    state.packages.set("pkg-1", {
      id: "pkg-1",
      tenantId: "tenant-1",
      name: "Glow Facial",
      serviceIds: ["service-1"],
      priceCents: 12000,
      durationDays: 30,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const service = createPackageService(prisma as never);

    const updated = await service.updatePackage({
      tenantId: "tenant-1",
      packageId: "pkg-1",
      input: { name: "Deluxe Facial", priceCents: 15000 },
    });

    expect(updated).not.toBeNull();
    expect(updated?.name).toBe("Deluxe Facial");
    expect(updated?.priceCents).toBe(15000);
    expect(updated?.durationDays).toBe(30);
    expect(updated?.serviceIds).toEqual(["service-1"]);
  });

  it("returns null when updating a nonexistent package", async () => {
    const { prisma } = createPackageFixture();
    const service = createPackageService(prisma as never);

    const updated = await service.updatePackage({
      tenantId: "tenant-1",
      packageId: "missing",
      input: { name: "Nobody" },
    });

    expect(updated).toBeNull();
  });

  it("returns null for cross-tenant update", async () => {
    const { prisma, state } = createPackageFixture();
    state.packages.set("pkg-1", {
      id: "pkg-1",
      tenantId: "tenant-2",
      name: "Glow Facial",
      serviceIds: ["service-1"],
      priceCents: 12000,
      durationDays: 30,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const service = createPackageService(prisma as never);

    const updated = await service.updatePackage({
      tenantId: "tenant-1",
      packageId: "pkg-1",
      input: { name: "Hijacked" },
    });

    expect(updated).toBeNull();
    expect(prisma.package.update).not.toHaveBeenCalled();
  });

  it("rejects updatePackage when a service belongs to another tenant", async () => {
    const { prisma, state } = createPackageFixture();
    state.packages.set("pkg-1", {
      id: "pkg-1",
      tenantId: "tenant-1",
      name: "Glow Facial",
      serviceIds: ["service-1"],
      priceCents: 12000,
      durationDays: 30,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.service.findUnique = vi.fn(async () => ({ id: "service-1", tenantId: "tenant-2" }));
    const service = createPackageService(prisma as never);

    await expect(
      service.updatePackage({
        tenantId: "tenant-1",
        packageId: "pkg-1",
        input: { serviceIds: ["service-1"] },
      }),
    ).rejects.toThrow("service must belong to the same tenant");
  });
});
