import { describe, expect, it, vi } from "vitest";
import { createSubscriptionLicenseService, type SubscriptionLicensePrismaClient } from "./subscription-license-service";

type AuditCapture = Array<{ tenantId: string; action: string; entityType: string; entityId: string; metadata: Record<string, unknown> }>;

function createPrisma(overrides: {
  tenant?: { id: string; isActive: boolean } | null;
  subscription?: { id: string; tenantId: string; planName: string; status: string; startedAt: Date; renewsAt: Date | null; expiresAt: Date | null; cancelledAt: Date | null; createdAt: Date; updatedAt: Date } | null;
  license?: { id: string; tenantId: string; status: string; issuedAt: Date; expiresAt: Date | null; features: Record<string, unknown> | null; createdAt: Date; updatedAt: Date } | null;
} = {}) {
  const tenant = overrides.tenant === undefined ? { id: "t1", isActive: true } : overrides.tenant;
  const subscription = overrides.subscription === undefined ? null : overrides.subscription;
  const license = overrides.license === undefined ? null : overrides.license;
  const auditLogs: AuditCapture = [];

  const prisma = {
    tenant: {
      findUnique: vi.fn(async () => tenant),
    },
    tenantSubscription: {
      findUnique: vi.fn(async () => subscription),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        id: "sub-1", tenantId: data.tenantId as string, planName: data.planName as string,
        status: data.status as string, startedAt: new Date(), renewsAt: data.renewsAt ?? null,
        expiresAt: data.expiresAt ?? null, cancelledAt: null, createdAt: new Date(), updatedAt: new Date(),
      })),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        id: "sub-1", tenantId: "t1", planName: "Pro", status: (data.status as string) ?? "ACTIVE",
        startedAt: new Date(), renewsAt: null, expiresAt: null,
        cancelledAt: (data.cancelledAt as Date) ?? null, createdAt: new Date(), updatedAt: new Date(),
      })),
    },
    tenantLicense: {
      findUnique: vi.fn(async () => license),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        id: "lic-1", tenantId: data.tenantId as string, status: data.status as string,
        issuedAt: new Date(), expiresAt: data.expiresAt ?? null,
        features: data.features ?? null, createdAt: new Date(), updatedAt: new Date(),
      })),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        id: "lic-1", tenantId: "t1", status: (data.status as string) ?? "ACTIVE",
        issuedAt: new Date(), expiresAt: data.expiresAt ?? null,
        features: data.features ?? null, createdAt: new Date(), updatedAt: new Date(),
      })),
    },
    auditLog: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        auditLogs.push(data as AuditCapture[number]);
        return {};
      }),
    },
  };

  return { prisma: prisma as unknown as SubscriptionLicensePrismaClient, auditLogs };
}

describe("subscription-license service: subscription", () => {
  it("returns null when no subscription exists", async () => {
    const { prisma } = createPrisma();
    const service = createSubscriptionLicenseService(prisma);
    expect(await service.getSubscription({ tenantId: "t1" })).toBeNull();
  });

  it("creates a subscription", async () => {
    const { prisma, auditLogs } = createPrisma();
    const service = createSubscriptionLicenseService(prisma);

    const sub = await service.createSubscription({ tenantId: "t1", input: { planName: "Pro" }, actorUserId: "user-1" });

    expect(sub.planName).toBe("Pro");
    expect(sub.status).toBe("ACTIVE");
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]?.action).toBe("subscription.created");
    expect(auditLogs[0]?.entityType).toBe("TenantSubscription");
  });

  it("rejects create when tenant not found", async () => {
    const { prisma } = createPrisma({ tenant: null });
    const service = createSubscriptionLicenseService(prisma);
    await expect(service.createSubscription({ tenantId: "t1", input: { planName: "Pro" } })).rejects.toThrow("tenant not found");
  });

  it("rejects create when subscription already exists", async () => {
    const { prisma } = createPrisma({ subscription: { id: "sub-1", tenantId: "t1", planName: "Pro", status: "ACTIVE", startedAt: new Date(), renewsAt: null, expiresAt: null, cancelledAt: null, createdAt: new Date(), updatedAt: new Date() } });
    const service = createSubscriptionLicenseService(prisma);
    await expect(service.createSubscription({ tenantId: "t1", input: { planName: "Pro" } })).rejects.toThrow("already exists");
  });

  it("updates subscription status", async () => {
    const { prisma, auditLogs } = createPrisma({ subscription: { id: "sub-1", tenantId: "t1", planName: "Pro", status: "ACTIVE", startedAt: new Date(), renewsAt: null, expiresAt: null, cancelledAt: null, createdAt: new Date(), updatedAt: new Date() } });
    const service = createSubscriptionLicenseService(prisma);

    const updated = await service.updateSubscription({ tenantId: "t1", input: { status: "CANCELLED" }, actorUserId: "user-1" });

    expect(updated).not.toBeNull();
    expect(updated?.status).toBe("CANCELLED");
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]?.action).toBe("subscription.updated");
  });

  it("rejects invalid subscription status", async () => {
    const { prisma } = createPrisma({ subscription: { id: "sub-1", tenantId: "t1", planName: "Pro", status: "ACTIVE", startedAt: new Date(), renewsAt: null, expiresAt: null, cancelledAt: null, createdAt: new Date(), updatedAt: new Date() } });
    const service = createSubscriptionLicenseService(prisma);
    await expect(service.updateSubscription({ tenantId: "t1", input: { status: "INVALID" } })).rejects.toThrow("invalid subscription status");
  });

  it("returns null when updating non-existent subscription", async () => {
    const { prisma } = createPrisma();
    const service = createSubscriptionLicenseService(prisma);
    expect(await service.updateSubscription({ tenantId: "t1", input: { status: "CANCELLED" } })).toBeNull();
  });
});

describe("subscription-license service: license", () => {
  it("returns null when no license exists", async () => {
    const { prisma } = createPrisma();
    const service = createSubscriptionLicenseService(prisma);
    expect(await service.getLicense({ tenantId: "t1" })).toBeNull();
  });

  it("creates a license", async () => {
    const { prisma, auditLogs } = createPrisma();
    const service = createSubscriptionLicenseService(prisma);

    const lic = await service.createLicense({ tenantId: "t1", input: { status: "ACTIVE", features: { maxUsers: 10 } }, actorUserId: "user-1" });

    expect(lic.status).toBe("ACTIVE");
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]?.action).toBe("license.created");
    expect(auditLogs[0]?.entityType).toBe("TenantLicense");
  });

  it("rejects create when tenant not found", async () => {
    const { prisma } = createPrisma({ tenant: null });
    const service = createSubscriptionLicenseService(prisma);
    await expect(service.createLicense({ tenantId: "t1", input: {} })).rejects.toThrow("tenant not found");
  });

  it("rejects create when license already exists", async () => {
    const { prisma } = createPrisma({ license: { id: "lic-1", tenantId: "t1", status: "ACTIVE", issuedAt: new Date(), expiresAt: null, features: null, createdAt: new Date(), updatedAt: new Date() } });
    const service = createSubscriptionLicenseService(prisma);
    await expect(service.createLicense({ tenantId: "t1", input: {} })).rejects.toThrow("already exists");
  });

  it("updates license status", async () => {
    const { prisma, auditLogs } = createPrisma({ license: { id: "lic-1", tenantId: "t1", status: "ACTIVE", issuedAt: new Date(), expiresAt: null, features: null, createdAt: new Date(), updatedAt: new Date() } });
    const service = createSubscriptionLicenseService(prisma);

    const updated = await service.updateLicense({ tenantId: "t1", input: { status: "SUSPENDED" }, actorUserId: "user-1" });

    expect(updated).not.toBeNull();
    expect(updated?.status).toBe("SUSPENDED");
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]?.action).toBe("license.updated");
  });

  it("rejects invalid license status", async () => {
    const { prisma } = createPrisma({ license: { id: "lic-1", tenantId: "t1", status: "ACTIVE", issuedAt: new Date(), expiresAt: null, features: null, createdAt: new Date(), updatedAt: new Date() } });
    const service = createSubscriptionLicenseService(prisma);
    await expect(service.updateLicense({ tenantId: "t1", input: { status: "INVALID" } })).rejects.toThrow("invalid license status");
  });

  it("returns null when updating non-existent license", async () => {
    const { prisma } = createPrisma();
    const service = createSubscriptionLicenseService(prisma);
    expect(await service.updateLicense({ tenantId: "t1", input: { status: "EXPIRED" } })).toBeNull();
  });
});