import "server-only";
import type { AuthenticationContext } from "@lwill/authentication-context/src/types";

const PLATFORM_DENIED: PlatformAuthorizationDecision = { allowed: false };

export interface PlatformAuthorizationDecision {
  readonly allowed: boolean;
  readonly userId?: string;
}

interface PlatformAuthorizationPrismaClient {
  readonly platformUserRole: {
    findMany(args: {
      where: { userId: string };
      select: {
        role: {
          select: {
            id: true;
            code: true;
            isActive: true;
            permissions: {
              select: { permission: { select: { code: true } } };
            };
          };
        };
      };
    }): Promise<
      ReadonlyArray<{
        readonly role: {
          readonly id: string;
          readonly code: string;
          readonly isActive: boolean;
          readonly permissions: ReadonlyArray<{
            readonly permission: { readonly code: string };
          }>;
        };
      }>
    >;
  };
}

export interface PlatformAuthorizationService {
  readonly authorize: (
    userId: string,
    permissionCode: string,
  ) => Promise<PlatformAuthorizationDecision>;
}

export function createPlatformAuthorizationService(
  prisma: PlatformAuthorizationPrismaClient,
): PlatformAuthorizationService {
  return {
    async authorize(userId: string, permissionCode: string) {
      const userRoles = await prisma.platformUserRole.findMany({
        where: { userId },
        select: {
          role: {
            select: {
              id: true,
              code: true,
              isActive: true,
              permissions: {
                select: { permission: { select: { code: true } } },
              },
            },
          },
        },
      });

      for (const userRole of userRoles) {
        if (!userRole.role.isActive) continue;
        for (const rp of userRole.role.permissions) {
          if (rp.permission.code === permissionCode) {
            return { allowed: true, userId };
          }
        }
      }

      return PLATFORM_DENIED;
    },
  };
}

export async function authorizePlatform(
  context: AuthenticationContext,
  permissionCode: string,
  service: PlatformAuthorizationService,
): Promise<PlatformAuthorizationDecision> {
  if (!context.authenticated) {
    return PLATFORM_DENIED;
  }
  try {
    return await service.authorize(context.user.userId, permissionCode);
  } catch {
    return PLATFORM_DENIED;
  }
}
