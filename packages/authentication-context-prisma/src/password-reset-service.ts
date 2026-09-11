import crypto from "node:crypto";
import {
  createTokenHash,
  createPasswordHash,
  verifyPasswordHash,
} from "./auth-persistence";

export interface PasswordResetRequestInput {
  readonly email: string;
  readonly tenantId: string;
}

export interface PasswordResetInput {
  readonly token: string;
  readonly newPassword: string;
  readonly tenantId: string;
}

export interface PasswordResetPrismaClient {
  readonly user: {
    findUnique: (args: {
      where: { email: string };
      include?: { passwordCredential?: boolean };
    }) => Promise<{
      id: string;
      email: string | null;
      isActive: boolean;
      passwordCredential?: { passwordHash: string } | null;
    } | null>;
  };
  readonly tenantMembership: {
    findFirst: (args: {
      where: { tenantId: string; userId: string; isActive: boolean };
    }) => Promise<{ tenantId: string; userId: string } | null>;
  };
  readonly passwordResetToken: {
    create: (args: {
      data: { userId: string; tokenHash: string; expiresAt: Date };
    }) => Promise<{ id: string }>;
    findUnique: (args: {
      where: { tokenHash: string };
    }) => Promise<{
      id: string;
      userId: string;
      tokenHash: string;
      expiresAt: Date;
      consumedAt: Date | null;
    } | null>;
    update: (args: {
      where: { id: string };
      data: { consumedAt: Date };
    }) => Promise<unknown>;
    updateMany: (args: {
      where: { userId: string; consumedAt: null };
      data: { consumedAt: Date };
    }) => Promise<unknown>;
  };
  readonly passwordCredential: {
    update: (args: {
      where: { userId: string };
      data: { passwordHash: string; passwordUpdatedAt: Date };
    }) => Promise<unknown>;
  };
  readonly authenticationSession: {
    updateMany: (args: {
      where: { userId: string; revokedAt: null };
      data: { revokedAt: Date };
    }) => Promise<unknown>;
  };
  readonly refreshToken: {
    updateMany: (args: {
      where: { userId: string; revokedAt: null };
      data: { revokedAt: Date };
    }) => Promise<unknown>;
  };
  readonly auditLog: {
    create: (args: {
      data: {
        tenantId: string;
        actorUserId: string | null;
        action: string;
        entityType: string;
        entityId: string;
        metadata?: Record<string, unknown>;
      };
    }) => Promise<unknown>;
  };
}

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

export async function requestPasswordReset(
  prisma: PasswordResetPrismaClient,
  input: PasswordResetRequestInput,
): Promise<void> {
  const normalizedEmail = input.email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { passwordCredential: true },
  });

  if (user === null || !user.isActive || user.passwordCredential === null || user.passwordCredential === undefined) {
    return;
  }

  const membership = await prisma.tenantMembership.findFirst({
    where: {
      tenantId: input.tenantId,
      userId: user.id,
      isActive: true,
    },
  });

  if (membership === null) {
    return;
  }

  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  const token = crypto.randomUUID();
  const tokenHash = createTokenHash(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  try {
    await prisma.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: user.id,
        action: "auth.password_reset.requested",
        entityType: "User",
        entityId: user.id,
        metadata: {
          email: normalizedEmail,
          expiresAt: expiresAt.toISOString(),
        },
      },
    });
  } catch {
    // Best-effort audit; do not break the reset flow.
  }
}

export async function resetPassword(
  prisma: PasswordResetPrismaClient,
  input: PasswordResetInput,
): Promise<boolean> {
  const tokenHash = createTokenHash(input.token);

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (record === null) {
    return false;
  }

  if (record.consumedAt !== null) {
    return false;
  }

  if (record.expiresAt < new Date()) {
    return false;
  }

  const passwordHash = await createPasswordHash(input.newPassword);

  await prisma.passwordCredential.update({
    where: { userId: record.userId },
    data: {
      passwordHash,
      passwordUpdatedAt: new Date(),
    },
  });

  await prisma.passwordResetToken.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });

  await prisma.passwordResetToken.updateMany({
    where: { userId: record.userId, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  await prisma.authenticationSession.updateMany({
    where: { userId: record.userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await prisma.refreshToken.updateMany({
    where: { userId: record.userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  try {
    await prisma.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: record.userId,
        action: "auth.password_reset.completed",
        entityType: "User",
        entityId: record.userId,
        metadata: {
          tokenId: record.id,
        },
      },
    });
  } catch {
    // Best-effort audit; do not break the reset flow.
  }

  return true;
}
