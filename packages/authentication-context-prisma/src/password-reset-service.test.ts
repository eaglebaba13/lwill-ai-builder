import { describe, expect, it, vi } from "vitest";
import {
  requestPasswordReset,
  resetPassword,
  type PasswordResetPrismaClient,
} from "./password-reset-service";
import { createTokenHash } from "./auth-persistence";

function createPrisma(overrides: {
  user?: { id: string; email: string; isActive: boolean; passwordCredential: { passwordHash: string } | null } | null;
  membership?: { tenantId: string; userId: string } | null;
  resetTokens?: Array<{ id: string; userId: string; tokenHash: string; expiresAt: Date; consumedAt: Date | null }>;
} = {}) {
  const defaultUser = { id: "user-1", email: "test@example.com", isActive: true, passwordCredential: { passwordHash: "$argon2id$hash" } };
  const defaultMembership = { tenantId: "tenant-1", userId: "user-1" };
  const user = overrides.user === undefined ? defaultUser : overrides.user;
  const membership = overrides.membership === undefined ? defaultMembership : overrides.membership;
  const resetTokens = overrides.resetTokens ?? [];

  const auditLogs: Array<Record<string, unknown>> = [];
  const createdTokens: Array<{ userId: string; tokenHash: string; expiresAt: Date }> = [];
  const revokedSessions: Array<{ userId: string; revokedAt: Date }> = [];
  const revokedRefreshTokens: Array<{ userId: string; revokedAt: Date }> = [];
  const updatedPasswords: Array<{ userId: string; passwordHash: string }> = [];
  const consumedTokens: Array<{ id: string; consumedAt: Date }> = [];

  const prisma = {
    user: {
      findUnique: vi.fn(async () => user),
    },
    tenantMembership: {
      findFirst: vi.fn(async () => membership),
    },
    passwordResetToken: {
      create: vi.fn(async ({ data }: { data: { userId: string; tokenHash: string; expiresAt: Date } }) => {
        createdTokens.push(data);
        return { id: `token-${createdTokens.length}` };
      }),
      findUnique: vi.fn(async ({ where }: { where: { tokenHash: string } }) => {
        return resetTokens.find((t) => t.tokenHash === where.tokenHash) ?? null;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: { consumedAt: Date } }) => {
        consumedTokens.push({ id: where.id, consumedAt: data.consumedAt });
        return {};
      }),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    passwordCredential: {
      update: vi.fn(async ({ where, data }: { where: { userId: string }; data: { passwordHash: string } }) => {
        updatedPasswords.push({ userId: where.userId, passwordHash: data.passwordHash });
        return {};
      }),
    },
    authenticationSession: {
      updateMany: vi.fn(async ({ where, data }: { where: { userId: string; revokedAt: null }; data: { revokedAt: Date } }) => {
        revokedSessions.push({ userId: where.userId, revokedAt: data.revokedAt });
        return { count: 1 };
      }),
    },
    refreshToken: {
      updateMany: vi.fn(async ({ where, data }: { where: { userId: string; revokedAt: null }; data: { revokedAt: Date } }) => {
        revokedRefreshTokens.push({ userId: where.userId, revokedAt: data.revokedAt });
        return { count: 1 };
      }),
    },
    auditLog: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        auditLogs.push(data);
        return {};
      }),
    },
  };

  return { prisma: prisma as unknown as PasswordResetPrismaClient, createdTokens, revokedSessions, revokedRefreshTokens, updatedPasswords, consumedTokens, auditLogs };
}

describe("password reset service: requestPasswordReset", () => {
  it("creates a reset token for a valid user", async () => {
    const { prisma, createdTokens, auditLogs } = createPrisma();

    await requestPasswordReset(prisma, { email: "test@example.com", tenantId: "tenant-1" });

    expect(createdTokens).toHaveLength(1);
    expect(createdTokens[0]?.userId).toBe("user-1");
    expect(createdTokens[0]?.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]?.action).toBe("auth.password_reset.requested");
  });

  it("does nothing when user does not exist", async () => {
    const { prisma, createdTokens, auditLogs } = createPrisma({ user: null });

    await requestPasswordReset(prisma, { email: "unknown@example.com", tenantId: "tenant-1" });

    expect(createdTokens).toHaveLength(0);
    expect(auditLogs).toHaveLength(0);
  });

  it("does nothing when user is inactive", async () => {
    const { prisma, createdTokens } = createPrisma({
      user: { id: "user-1", email: "test@example.com", isActive: false, passwordCredential: { passwordHash: "$argon2id$hash" } },
    });

    await requestPasswordReset(prisma, { email: "test@example.com", tenantId: "tenant-1" });

    expect(createdTokens).toHaveLength(0);
  });

  it("does nothing when user has no password credential", async () => {
    const { prisma, createdTokens } = createPrisma({
      user: { id: "user-1", email: "test@example.com", isActive: true, passwordCredential: null as unknown as { passwordHash: string } },
    });

    await requestPasswordReset(prisma, { email: "test@example.com", tenantId: "tenant-1" });

    expect(createdTokens).toHaveLength(0);
  });

  it("does nothing when user has no tenant membership", async () => {
    const { prisma, createdTokens } = createPrisma({ membership: null });

    await requestPasswordReset(prisma, { email: "test@example.com", tenantId: "tenant-1" });

    expect(createdTokens).toHaveLength(0);
  });
});

describe("password reset service: resetPassword", () => {
  it("resets password with a valid token", async () => {
    const token = "a]b]c]d]e]f]g]h";
    const tokenHash = createTokenHash(token);
    const { prisma, updatedPasswords, consumedTokens, revokedSessions, revokedRefreshTokens, auditLogs } = createPrisma({
      resetTokens: [{ id: "token-1", userId: "user-1", tokenHash, expiresAt: new Date(Date.now() + 3600000), consumedAt: null }],
    });

    const result = await resetPassword(prisma, { token, newPassword: "newpassword123", tenantId: "tenant-1" });

    expect(result).toBe(true);
    expect(updatedPasswords).toHaveLength(1);
    expect(updatedPasswords[0]?.userId).toBe("user-1");
    expect(consumedTokens).toHaveLength(1);
    expect(consumedTokens[0]?.id).toBe("token-1");
    expect(revokedSessions).toHaveLength(1);
    expect(revokedRefreshTokens).toHaveLength(1);
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]?.action).toBe("auth.password_reset.completed");
  });

  it("rejects an unknown token", async () => {
    const { prisma, updatedPasswords } = createPrisma({ resetTokens: [] });

    const result = await resetPassword(prisma, { token: "unknown-token", newPassword: "newpassword123", tenantId: "tenant-1" });

    expect(result).toBe(false);
    expect(updatedPasswords).toHaveLength(0);
  });

  it("rejects an expired token", async () => {
    const token = "expired-token";
    const tokenHash = createTokenHash(token);
    const { prisma, updatedPasswords } = createPrisma({
      resetTokens: [{ id: "token-1", userId: "user-1", tokenHash, expiresAt: new Date(Date.now() - 1000), consumedAt: null }],
    });

    const result = await resetPassword(prisma, { token, newPassword: "newpassword123", tenantId: "tenant-1" });

    expect(result).toBe(false);
    expect(updatedPasswords).toHaveLength(0);
  });

  it("rejects a consumed token", async () => {
    const token = "consumed-token";
    const tokenHash = createTokenHash(token);
    const { prisma, updatedPasswords } = createPrisma({
      resetTokens: [{ id: "token-1", userId: "user-1", tokenHash, expiresAt: new Date(Date.now() + 3600000), consumedAt: new Date() }],
    });

    const result = await resetPassword(prisma, { token, newPassword: "newpassword123", tenantId: "tenant-1" });

    expect(result).toBe(false);
    expect(updatedPasswords).toHaveLength(0);
  });
});