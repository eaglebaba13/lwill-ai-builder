import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPasswordHash } from "../../../../packages/authentication-context-prisma/src/auth-persistence";
import { loginWithEmailPassword } from "../lib/auth/login-service";

describe("loginWithEmailPassword", () => {
  const tenantId = "tenant-123";
  const expiresAt = new Date("2099-01-01T00:00:00.000Z");
  const refreshTokenExpiresAt = new Date("2099-02-01T00:00:00.000Z");

  const prisma = {
    user: {
      findUnique: vi.fn(),
    },
    tenantMembership: {
      findFirst: vi.fn(),
    },
    authenticationSession: {
      create: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a verified session and hashed refresh token for a valid password login", async () => {
    const passwordHash = await createPasswordHash("SuperSecure123!");

    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      displayName: "Test User",
      isActive: true,
      passwordCredential: {
        passwordHash,
      },
    });

    prisma.tenantMembership.findFirst.mockResolvedValue({
      tenantId,
      userId: "user-1",
      isActive: true,
    });

    prisma.authenticationSession.create.mockResolvedValue({
      id: "session-1",
      userId: "user-1",
      tenantId,
      expiresAt,
      revokedAt: null,
      lastSeenAt: null,
      userAgent: "Mozilla/5.0",
      ipAddress: "127.0.0.1",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    prisma.refreshToken.create.mockResolvedValue({ id: "refresh-1" });
    prisma.auditLog.create.mockResolvedValue({ id: "audit-1" });

    const result = await loginWithEmailPassword(prisma as never, {
      email: "user@example.com",
      password: "SuperSecure123!",
      tenantId,
      expiresAt,
      refreshTokenExpiresAt,
      userAgent: "Mozilla/5.0",
      ipAddress: "127.0.0.1",
    });

    expect(result).not.toBeNull();
    expect(result?.verifiedSession.userId).toBe("user-1");
    expect(result?.verifiedSession.tenantId).toBe(tenantId);
    expect(result?.refreshToken).toBeTruthy();
    expect(prisma.authenticationSession.create).toHaveBeenCalled();
    expect(prisma.refreshToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tokenHash: expect.any(String),
        }),
      }),
    );
  });

  it("returns null for an invalid password", async () => {
    const passwordHash = await createPasswordHash("SuperSecure123!");

    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      displayName: "Test User",
      isActive: true,
      passwordCredential: {
        passwordHash,
      },
    });

    const result = await loginWithEmailPassword(prisma as never, {
      email: "user@example.com",
      password: "WrongPassword",
      tenantId,
      expiresAt,
      refreshTokenExpiresAt,
      userAgent: "Mozilla/5.0",
      ipAddress: "127.0.0.1",
    });

    expect(result).toBeNull();
    expect(prisma.authenticationSession.create).not.toHaveBeenCalled();
  });
});
