import { describe, expect, it, vi } from "vitest";
import { resolveTenantByHostname } from "./tenant-domain";
import {
  readTenantDomainVerificationInput,
  verifyInitialTenantDomain,
  type TenantDomainVerificationPrismaClient,
} from "./tenant-domain-verification";

function resolverRecord(status: string, isActive = true) {
  return [{
    id: "domain-1",
    tenantId: "tenant-1",
    domain: "builder.lwill.in",
    isPrimary: false,
    verificationStatus: status,
    isActive,
    tenant: { id: "tenant-1", isActive: true },
  }];
}

function createFixture(overrides: {
  domainTenantId?: string;
  status?: string;
  authorized?: boolean;
} = {}) {
  const state = { status: overrides.status ?? "pending" };
  const transaction = {
    tenant: {
      findMany: vi.fn(async () => [{
        id: "tenant-1",
        name: "HDK Beauty I Pvt. Ltd.",
        slug: "hdk-beauty-i-pvt-ltd",
        isActive: true,
      }]),
    },
    tenantDomain: {
      findUnique: vi.fn(async () => ({
        id: "domain-1",
        tenantId: overrides.domainTenantId ?? "tenant-1",
        domain: "builder.lwill.in",
        verificationStatus: state.status,
        isActive: true,
      })),
      updateMany: vi.fn(async () => {
        state.status = "verified";
        return { count: 1 };
      }),
    },
    user: {
      findUnique: vi.fn(async () => ({ id: "user-1", isActive: true })),
    },
    tenantMembership: {
      findUnique: vi.fn(async () => ({
        isActive: true,
        roles: overrides.authorized === false ? [] : [{
          role: {
            isActive: true,
            permissions: [{ permission: { code: "tenant.manage" } }],
          },
        }],
      })),
    },
    auditLog: {
      create: vi.fn(async () => ({ id: "audit-1" })),
    },
  };
  const prisma: TenantDomainVerificationPrismaClient = {
    $transaction: vi.fn(async (callback) => callback(transaction as never)),
  };
  return { prisma, state, transaction };
}

const input = {
  actorEmail: "admin@example.test",
  confirmedDomain: "builder.lwill.in",
};

describe("tenant domain verification", () => {
  it("keeps pending domains rejected by hostname resolution", () => {
    expect(resolveTenantByHostname("builder.lwill.in", resolverRecord("pending")))
      .toBeNull();
  });

  it("accepts active verified domains through hostname resolution", () => {
    expect(resolveTenantByHostname("builder.lwill.in", resolverRecord("verified"))?.tenantId)
      .toBe("tenant-1");
  });

  it("keeps inactive verified domains rejected by hostname resolution", () => {
    expect(resolveTenantByHostname("builder.lwill.in", resolverRecord("verified", false)))
      .toBeNull();
  });

  it("rejects wrong or cross-tenant domain ownership", async () => {
    await expect(verifyInitialTenantDomain(createFixture({
      domainTenantId: "tenant-2",
    }).prisma, input)).rejects.toThrow("Active tenant domain ownership does not match");
  });

  it("rejects verification without an authorized tenant administrator", async () => {
    const fixture = createFixture({ authorized: false });

    await expect(verifyInitialTenantDomain(fixture.prisma, input)).rejects.toThrow(
      "Tenant domain verification is not authorized",
    );
    expect(fixture.transaction.tenantDomain.updateMany).not.toHaveBeenCalled();
  });

  it("allows an authorized tenant administrator and audits the transition", async () => {
    const fixture = createFixture();

    const result = await verifyInitialTenantDomain(fixture.prisma, input);

    expect(result).toMatchObject({
      verificationStatus: "verified",
      verificationChanged: true,
      actorUserId: "user-1",
    });
    expect(fixture.transaction.tenantDomain.updateMany).toHaveBeenCalledWith({
      where: {
        id: "domain-1",
        tenantId: "tenant-1",
        isActive: true,
        verificationStatus: "pending",
      },
      data: { verificationStatus: "verified" },
    });
    expect(fixture.transaction.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: "user-1",
        action: "tenant-domain.verified",
        entityType: "TenantDomain",
      }),
    });
  });

  it("is idempotent for an already verified domain", async () => {
    const fixture = createFixture({ status: "verified" });

    const result = await verifyInitialTenantDomain(fixture.prisma, input);

    expect(result.verificationChanged).toBe(false);
    expect(fixture.transaction.tenantDomain.updateMany).not.toHaveBeenCalled();
    expect(fixture.transaction.auditLog.create).not.toHaveBeenCalled();
  });

  it("requires protected actor input and exact operator confirmation", () => {
    expect(() => readTenantDomainVerificationInput({}, [
      "--confirm=builder.lwill.in",
    ])).toThrow("LWILL_VERIFY_TENANT_DOMAIN_ADMIN_EMAIL");
    expect(() => readTenantDomainVerificationInput({
      LWILL_VERIFY_TENANT_DOMAIN_ADMIN_EMAIL: "admin@example.test",
    }, [])).toThrow("Explicit confirmation required");
  });
});