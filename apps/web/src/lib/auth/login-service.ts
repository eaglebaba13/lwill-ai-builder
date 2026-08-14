import crypto from "node:crypto";
import {
  createTokenHash,
  verifyPasswordHash,
} from "../../../../../packages/authentication-context-prisma/src/auth-persistence";
import type { VerifiedSessionRecord } from "./session-provider";

export interface EmailPasswordLoginInput {
  readonly email: string;
  readonly password: string;
  readonly tenantId: string;
  readonly expiresAt: Date;
  readonly refreshTokenExpiresAt: Date;
  readonly userAgent?: string | null;
  readonly ipAddress?: string | null;
}

export interface EmailPasswordLoginResult {
  readonly verifiedSession: VerifiedSessionRecord;
  readonly refreshToken: string;
}

export interface LoginPrismaClient {
  readonly user: {
    findUnique: (args: {
      where: { email: string };
      include?: { passwordCredential?: boolean };
    }) => Promise<{
      id: string;
      email: string | null;
      displayName: string | null;
      externalAuthId?: string | null;
      isActive: boolean;
      passwordCredential?: { passwordHash: string } | null;
    } | null>;
  };
  readonly tenantMembership: {
    findFirst: (args: {
      where: {
        tenantId: string;
        userId: string;
        isActive: boolean;
      };
    }) => Promise<{ tenantId: string; userId: string; isActive: boolean } | null>;
  };
  readonly authenticationSession: {
    create: (args: {
      data: {
        userId: string;
        tenantId: string;
        expiresAt: Date;
        userAgent?: string | null;
        ipAddress?: string | null;
      };
    }) => Promise<{
      id: string;
      userId: string;
      tenantId: string | null;
      expiresAt: Date;
      revokedAt: Date | null;
      lastSeenAt: Date | null;
      userAgent: string | null;
      ipAddress: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>;
  };
  readonly refreshToken: {
    create: (args: {
      data: {
        userId: string;
        sessionId: string;
        tokenHash: string;
        expiresAt: Date;
      };
    }) => Promise<unknown>;
  };
  readonly auditLog: {
    create: (args: {
      data: {
        tenantId: string;
        actorUserId: string;
        action: string;
        entityType: string;
        entityId: string;
        metadata?: Record<string, unknown>;
      };
    }) => Promise<unknown>;
  };
}

export async function loginWithEmailPassword(
  prisma: LoginPrismaClient,
  input: EmailPasswordLoginInput,
): Promise<EmailPasswordLoginResult | null> {
  const normalizedEmail = input.email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { passwordCredential: true },
  });

  if (user === null || !user.isActive) {
    return null;
  }

  const membership = await prisma.tenantMembership.findFirst({
    where: {
      tenantId: input.tenantId,
      userId: user.id,
      isActive: true,
    },
  });

  if (membership === null) {
    return null;
  }

  if (user.passwordCredential === null || user.passwordCredential === undefined) {
    return null;
  }

  const isPasswordValid = await verifyPasswordHash(
    input.password,
    user.passwordCredential.passwordHash,
  );

  if (!isPasswordValid) {
    try {
      await prisma.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorUserId: user.id,
          action: "auth.login.failed",
          entityType: "User",
          entityId: user.id,
          metadata: {
            reason: "invalid_password",
            email: normalizedEmail,
          },
        },
      });
    } catch {
      // Fail closed for the auth flow, but avoid breaking the caller on logging issues.
    }
    return null;
  }

  const session = await prisma.authenticationSession.create({
    data: {
      userId: user.id,
      tenantId: input.tenantId,
      expiresAt: input.expiresAt,
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
    },
  });

  const refreshToken = crypto.randomUUID();
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      sessionId: session.id,
      tokenHash: createTokenHash(refreshToken),
      expiresAt: input.refreshTokenExpiresAt,
    },
  });

  try {
    await prisma.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: user.id,
        action: "auth.login.succeeded",
        entityType: "AuthenticationSession",
        entityId: session.id,
        metadata: {
          email: normalizedEmail,
          sessionId: session.id,
        },
      },
    });
  } catch {
    // Fail closed for the auth flow, but avoid breaking the caller on logging issues.
  }

  return {
    verifiedSession: {
      sessionId: session.id,
      userId: user.id,
      externalAuthId: user.externalAuthId ?? user.id,
      displayName: user.displayName,
      email: user.email,
      tenantId: input.tenantId,
      businessUnitId: null,
      branchId: null,
      expiresAt: session.expiresAt,
    },
    refreshToken,
  };
}
