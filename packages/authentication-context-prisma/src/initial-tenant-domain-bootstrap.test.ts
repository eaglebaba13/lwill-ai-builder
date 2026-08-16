import { describe, expect, it, vi } from "vitest";
import {
  bootstrapInitialTenantDomain,
  type InitialTenantDomainBootstrapPrismaClient,
} from "./initial-tenant-domain-bootstrap";

const approvedTenant = {
  id: "tenant-1",
  name: "HDK Beauty I Pvt. Ltd.",
  slug: "hdk-beauty-i-pvt-ltd",
  isActive: true,
};

function createFixture(overrides: {
  tenants?: Array<typeof approvedTenant>;
  domain?: {
    id: string;
    tenantId: string;
    domain: string;
    isPrimary: boolean;
    verificationStatus: string;
    isActive: boolean;
  } | null;
} = {}) {
  const state = {
    domain: overrides.domain === undefined ? null : overrides.domain,
  };
  const transaction = {
    tenant: {
      findMany: vi.fn(async () => overrides.tenants ?? [approvedTenant]),
    },
    tenantDomain: {
      findUnique: vi.fn(async () => state.domain),
      create: vi.fn(async ({ data }) => {
        state.domain = {
          id: "domain-1",
          ...data,
          isPrimary: false,
          verificationStatus: "pending",
        };
        return state.domain;
      }),
    },
  };
  const prisma: InitialTenantDomainBootstrapPrismaClient = {
    $transaction: vi.fn(async (callback) => callback(transaction as never)),
  };
  return { prisma, transaction };
}

describe("initial tenant domain bootstrap", () => {
  it("creates an active pending builder.lwill.in mapping", async () => {
    const fixture = createFixture();

    const result = await bootstrapInitialTenantDomain(fixture.prisma);

    expect(result).toEqual({
      tenantId: "tenant-1",
      domain: "builder.lwill.in",
      domainCreated: true,
      isPrimary: false,
      verificationStatus: "pending",
      isActive: true,
    });
    expect(fixture.transaction.tenantDomain.create).toHaveBeenCalledWith({
      data: {
        tenantId: "tenant-1",
        domain: "builder.lwill.in",
        isActive: true,
      },
      select: expect.any(Object),
    });
    expect(
      fixture.transaction.tenantDomain.create.mock.calls[0]?.[0].data,
    ).not.toHaveProperty("verificationStatus");
  });

  it("is idempotent for an existing mapping owned by the approved tenant", async () => {
    const fixture = createFixture({
      domain: {
        id: "domain-1",
        tenantId: "tenant-1",
        domain: "builder.lwill.in",
        isPrimary: false,
        verificationStatus: "verified",
        isActive: true,
      },
    });

    const result = await bootstrapInitialTenantDomain(fixture.prisma);

    expect(result.domainCreated).toBe(false);
    expect(result.verificationStatus).toBe("verified");
    expect(fixture.transaction.tenantDomain.create).not.toHaveBeenCalled();
  });

  it("fails closed when builder.lwill.in belongs to another tenant", async () => {
    const fixture = createFixture({
      domain: {
        id: "domain-1",
        tenantId: "tenant-2",
        domain: "builder.lwill.in",
        isPrimary: false,
        verificationStatus: "verified",
        isActive: true,
      },
    });

    await expect(bootstrapInitialTenantDomain(fixture.prisma)).rejects.toThrow(
      "builder.lwill.in is assigned to another tenant",
    );
  });

  it("fails closed when the approved tenant is missing", async () => {
    await expect(bootstrapInitialTenantDomain(createFixture({ tenants: [] }).prisma))
      .rejects.toThrow("Approved tenant is missing");
  });

  it("fails closed when the approved tenant is ambiguous", async () => {
    await expect(bootstrapInitialTenantDomain(createFixture({
      tenants: [approvedTenant, { ...approvedTenant, id: "tenant-2" }],
    }).prisma)).rejects.toThrow("Approved tenant is ambiguous");
  });

  it("fails closed when the approved tenant is inactive", async () => {
    await expect(bootstrapInitialTenantDomain(createFixture({
      tenants: [{ ...approvedTenant, isActive: false }],
    }).prisma)).rejects.toThrow("Approved tenant is inactive");
  });
});