import "server-only";
import { prisma } from "../../../../../packages/database/src/client";
import type { AuthenticationProvider } from "@lwill/authentication-context/src/types";
import {
  validateTenantContext,
  type TenantHierarchyVerifier,
} from "@lwill/authentication-context/src/tenant-context-validator";
import { createPrismaTenantHierarchyVerifier } from "../../../../../packages/authentication-context-prisma/src/tenant-hierarchy-verifier";
import {
  createSessionAuthenticationProvider,
  type VerifiedSessionRecord,
  type VerifiedSessionSource,
} from "./session-provider";

interface PrismaAuthenticationSessionRecord {
  readonly id: string;
  readonly userId: string;
  readonly tenantId: string | null;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly lastSeenAt: Date | null;
  readonly userAgent: string | null;
  readonly ipAddress: string | null;
}

interface PrismaUserRecord {
  readonly id: string;
  readonly email: string | null;
  readonly displayName: string | null;
  readonly externalAuthId: string | null;
  readonly isActive: boolean;
}

interface PrismaTenantMembershipRecord {
  readonly tenantId: string;
  readonly userId: string;
  readonly isActive: boolean;
}

export interface PrismaSessionClient {
  readonly authenticationSession: {
    findUnique: (args: {
      where: { id: string };
    }) => Promise<PrismaAuthenticationSessionRecord | null>;
  };
  readonly user: {
    findUnique: (args: {
      where: { id: string };
    }) => Promise<PrismaUserRecord | null>;
  };
  readonly tenantMembership: {
    findFirst: (args: {
      where: {
        tenantId: string;
        userId: string;
        isActive: boolean;
      };
    }) => Promise<PrismaTenantMembershipRecord | null>;
  };
}

export interface TenantContextSelection {
  readonly tenantId: string | null;
  readonly businessUnitId: string | null;
  readonly branchId: string | null;
}

export interface PrismaSessionSourceOptions {
  readonly resolveSessionId?: () => Promise<string | null> | string | null;
  readonly resolveTenantContext?: (
    session: PrismaAuthenticationSessionRecord,
  ) => Promise<TenantContextSelection | null> | TenantContextSelection | null;
  readonly prismaClient?: PrismaSessionClient;
  readonly verifier?: TenantHierarchyVerifier;
  readonly now?: Date;
}

export function createPrismaVerifiedSessionSource(
  options: PrismaSessionSourceOptions = {},
): VerifiedSessionSource {
  const resolveSessionId = options.resolveSessionId ?? (async () => null);
  const resolveTenantContext = options.resolveTenantContext;
  const prismaClient = options.prismaClient ?? prisma;
  const verifier = options.verifier ?? createPrismaTenantHierarchyVerifier();
  const now = options.now ?? new Date();

  return {
    async getVerifiedSession(): Promise<VerifiedSessionRecord | null> {
      try {
        const sessionId = await resolveSessionId();
        if (sessionId === null || sessionId.trim() === "") {
          return null;
        }

        const session = await prismaClient.authenticationSession.findUnique({
          where: { id: sessionId },
        });

        if (session === null) {
          return null;
        }

        if (session.revokedAt !== null) {
          return null;
        }

        if (session.expiresAt <= now) {
          return null;
        }

        const user = await prismaClient.user.findUnique({
          where: { id: session.userId },
        });

        if (user === null || !user.isActive) {
          return null;
        }

        const selectedTenantContext = resolveTenantContext
          ? await resolveTenantContext(session)
          : null;

        const tenantId =
          selectedTenantContext?.tenantId ?? session.tenantId ?? null;

        if (tenantId === null) {
          return {
            sessionId: session.id,
            userId: user.id,
            externalAuthId: user.externalAuthId ?? user.id,
            displayName: user.displayName,
            email: user.email,
            tenantId: null,
            businessUnitId: null,
            branchId: null,
            expiresAt: session.expiresAt,
          };
        }

        const membership = await prismaClient.tenantMembership.findFirst({
          where: {
            tenantId,
            userId: user.id,
            isActive: true,
          },
        });

        if (membership === null) {
          return null;
        }

        const resolvedTenantContext =
          selectedTenantContext === null
            ? { tenantId, businessUnitId: null, branchId: null }
            : {
                tenantId,
                businessUnitId: selectedTenantContext.businessUnitId,
                branchId: selectedTenantContext.branchId,
              };

        if (
          resolvedTenantContext.businessUnitId !== null ||
          resolvedTenantContext.branchId !== null
        ) {
          const validation = await validateTenantContext(
            tenantId,
            resolvedTenantContext.businessUnitId ?? "",
            resolvedTenantContext.branchId ?? "",
            verifier,
          );

          if (!validation.valid) {
            return null;
          }
        }

        return {
          sessionId: session.id,
          userId: user.id,
          externalAuthId: user.externalAuthId ?? user.id,
          displayName: user.displayName,
          email: user.email,
          tenantId,
          businessUnitId: resolvedTenantContext.businessUnitId,
          branchId: resolvedTenantContext.branchId,
          expiresAt: session.expiresAt,
        };
      } catch {
        return null;
      }
    },
  };
}

export function createPrismaSessionAuthenticationProvider(
  options: PrismaSessionSourceOptions = {},
): AuthenticationProvider {
  return createSessionAuthenticationProvider(
    createPrismaVerifiedSessionSource(options),
  );
}
