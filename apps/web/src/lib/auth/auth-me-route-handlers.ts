import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { prisma } from "../../../../../packages/database/src/client";

export interface AuthMeResponse {
  readonly user: {
    readonly userId: string;
    readonly email: string | null;
    readonly displayName: string | null;
  };
  readonly tenantContext: {
    readonly tenantId: string;
    readonly businessUnitId: string | null;
    readonly branchId: string | null;
  } | null;
  readonly roles: readonly AuthMeRole[];
  readonly permissionCodes: readonly string[];
}

export interface AuthMeRole {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly scope:
    | { readonly kind: "tenant" }
    | { readonly kind: "business-unit"; readonly businessUnitId: string }
    | { readonly kind: "branch"; readonly businessUnitId: string; readonly branchId: string };
  readonly permissions: readonly { readonly code: string }[];
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) {
    return new Response(null, { status, headers: RESPONSE_HEADERS });
  }
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

export async function handleGetAuthMe(): Promise<Response> {
  const context = await getAuthenticationContext();
  if (!context.authenticated) {
    return response(401, { error: "unauthenticated" });
  }
  if (context.tenantContext === null) {
    return response(403, { error: "forbidden" });
  }

  const { tenantId, userId } = context.tenantContext.tenantId ? { tenantId: context.tenantContext.tenantId, userId: context.user.userId } : { tenantId: null as string | null, userId: context.user.userId };
  if (tenantId === null) {
    return response(403, { error: "forbidden" });
  }

  const membership = await prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: {
                    select: { code: true },
                  },
                },
              },
            },
          },
        },
      },
      businessUnitRoles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: {
                    select: { code: true },
                  },
                },
              },
            },
          },
        },
      },
      branchRoles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: {
                    select: { code: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (membership === null || !membership.isActive) {
    return response(403, { error: "forbidden" });
  }

  const roles: AuthMeRole[] = [
    ...membership.roles.map((assignment) => ({
      id: assignment.role.id,
      code: assignment.role.code,
      name: assignment.role.name,
      scope: { kind: "tenant" as const },
      permissions: assignment.role.permissions.map((rp) => ({ code: rp.permission.code })),
    })),
    ...membership.businessUnitRoles.map((assignment) => ({
      id: assignment.role.id,
      code: assignment.role.code,
      name: assignment.role.name,
      scope: { kind: "business-unit" as const, businessUnitId: assignment.businessUnitId },
      permissions: assignment.role.permissions.map((rp) => ({ code: rp.permission.code })),
    })),
    ...membership.branchRoles.map((assignment) => ({
      id: assignment.role.id,
      code: assignment.role.code,
      name: assignment.role.name,
      scope: { kind: "branch" as const, businessUnitId: assignment.businessUnitId, branchId: assignment.branchId },
      permissions: assignment.role.permissions.map((rp) => ({ code: rp.permission.code })),
    })),
  ];

  const permissionCodes = Array.from(
    new Set(roles.flatMap((role) => role.permissions.map((permission) => permission.code))),
  ).sort();

  const payload: AuthMeResponse = {
    user: {
      userId: context.user.userId,
      email: context.user.email,
      displayName: context.user.displayName,
    },
    tenantContext: context.tenantContext,
    roles,
    permissionCodes,
  };

  return response(200, payload);
}
