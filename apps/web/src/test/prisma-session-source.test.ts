import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPrismaVerifiedSessionSource } from "../lib/auth/prisma-session-source";

interface SessionRecord {
  readonly id: string;
  readonly userId: string;
  readonly tenantId: string;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly lastSeenAt: Date | null;
  readonly userAgent: string | null;
  readonly ipAddress: string | null;
}

function makeSession(overrides: Partial<SessionRecord> = {}) {
  return {
    id: "session-1",
    userId: "user-1",
    tenantId: "tenant-1",
    expiresAt: new Date("2099-01-01T00:00:00.000Z"),
    revokedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    lastSeenAt: null,
    userAgent: "Mozilla/5.0",
    ipAddress: "127.0.0.1",
    ...overrides,
  };
}

describe("createPrismaVerifiedSessionSource", () => {
  const prismaClient = {
    authenticationSession: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    tenantMembership: {
      findFirst: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a verified session for a valid session and active user", async () => {
    prismaClient.authenticationSession.findUnique.mockResolvedValue(makeSession());
    prismaClient.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      displayName: "Test User",
      externalAuthId: "ext-1",
      isActive: true,
    });
    prismaClient.tenantMembership.findFirst.mockResolvedValue({
      tenantId: "tenant-1",
      userId: "user-1",
      isActive: true,
    });

    const source = createPrismaVerifiedSessionSource({
      resolveSessionId: async () => "session-1",
      prismaClient: prismaClient as never,
      verifier: {
        async isBusinessUnitInTenant() {
          return true;
        },
        async isBranchInBusinessUnit() {
          return true;
        },
      },
    });

    const record = await source.getVerifiedSession();

    expect(record).not.toBeNull();
    expect(record?.userId).toBe("user-1");
    expect(record?.tenantId).toBe("tenant-1");
  });

  it("returns null for an expired session", async () => {
    prismaClient.authenticationSession.findUnique.mockResolvedValue(
      makeSession({ expiresAt: new Date("2000-01-01T00:00:00.000Z") }),
    );

    const source = createPrismaVerifiedSessionSource({
      resolveSessionId: async () => "session-1",
      prismaClient: prismaClient as never,
      now: new Date("2099-01-01T00:00:00.000Z"),
    });

    const record = await source.getVerifiedSession();

    expect(record).toBeNull();
  });

  it("returns null for a revoked session", async () => {
    prismaClient.authenticationSession.findUnique.mockResolvedValue(
      makeSession({ revokedAt: new Date("2026-01-02T00:00:00.000Z") }),
    );

    const source = createPrismaVerifiedSessionSource({
      resolveSessionId: async () => "session-1",
      prismaClient: prismaClient as never,
    });

    const record = await source.getVerifiedSession();

    expect(record).toBeNull();
  });

  it("returns null for a missing session", async () => {
    prismaClient.authenticationSession.findUnique.mockResolvedValue(null);

    const source = createPrismaVerifiedSessionSource({
      resolveSessionId: async () => "session-1",
      prismaClient: prismaClient as never,
    });

    const record = await source.getVerifiedSession();

    expect(record).toBeNull();
  });

  it("returns null for an inactive user", async () => {
    prismaClient.authenticationSession.findUnique.mockResolvedValue(makeSession());
    prismaClient.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      displayName: "Test User",
      externalAuthId: "ext-1",
      isActive: false,
    });

    const source = createPrismaVerifiedSessionSource({
      resolveSessionId: async () => "session-1",
      prismaClient: prismaClient as never,
    });

    const record = await source.getVerifiedSession();

    expect(record).toBeNull();
  });

  it("returns null when an invalid tenant hierarchy is supplied", async () => {
    prismaClient.authenticationSession.findUnique.mockResolvedValue(makeSession());
    prismaClient.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      displayName: "Test User",
      externalAuthId: "ext-1",
      isActive: true,
    });
    prismaClient.tenantMembership.findFirst.mockResolvedValue({
      tenantId: "tenant-1",
      userId: "user-1",
      isActive: true,
    });

    const source = createPrismaVerifiedSessionSource({
      resolveSessionId: async () => "session-1",
      resolveTenantContext: () => ({
        tenantId: "tenant-1",
        businessUnitId: "bu-2",
        branchId: "branch-2",
      }),
      prismaClient: prismaClient as never,
      verifier: {
        async isBusinessUnitInTenant() {
          return false;
        },
        async isBranchInBusinessUnit() {
          return false;
        },
      },
    });

    const record = await source.getVerifiedSession();

    expect(record).toBeNull();
  });

  it("returns null for a missing tenant membership", async () => {
    prismaClient.authenticationSession.findUnique.mockResolvedValue(makeSession());
    prismaClient.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      displayName: "Test User",
      externalAuthId: "ext-1",
      isActive: true,
    });
    prismaClient.tenantMembership.findFirst.mockResolvedValue(null);

    const source = createPrismaVerifiedSessionSource({
      resolveSessionId: async () => "session-1",
      prismaClient: prismaClient as never,
    });

    const record = await source.getVerifiedSession();

    expect(record).toBeNull();
  });

  it("fails closed when the database throws", async () => {
    prismaClient.authenticationSession.findUnique.mockRejectedValue(new Error("db down"));

    const source = createPrismaVerifiedSessionSource({
      resolveSessionId: async () => "session-1",
      prismaClient: prismaClient as never,
    });

    const record = await source.getVerifiedSession();

    expect(record).toBeNull();
  });
});
