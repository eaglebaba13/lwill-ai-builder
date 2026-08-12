import { describe, expect, it } from "vitest";
import { createPackageService } from "./package-service";
import { createMembershipService } from "./membership-service";

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
