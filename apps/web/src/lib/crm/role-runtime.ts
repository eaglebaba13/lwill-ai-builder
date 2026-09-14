import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createRoleService } from "../../../../../packages/authentication-context-prisma/src/role-service";
import { getRoleScopeMetadata } from "../../../../../packages/authentication-context-prisma/src/xnail-role-bootstrap";
import type {
  RoleAuthorization,
  RoleRouteServices,
} from "./role-route-handlers";

const roleService = createRoleService(prisma as never);

const authService = createAuthorizationService({
  loadPermissionGrants,
});

async function authorize(permissionCode: string): Promise<RoleAuthorization> {
  const context = await getAuthenticationContext();
  if (!context.authenticated) {
    return { outcome: "unauthenticated" };
  }
  if (context.tenantContext === null) {
    return { outcome: "forbidden" };
  }
  const decision = await authorizeFromContext(
    context,
    {
      permissionCode,
      scope: { kind: "tenant", tenantId: context.tenantContext.tenantId },
    },
    authService,
  );
  if (!decision.allowed) {
    return { outcome: "forbidden" };
  }
  return { outcome: "authorized", tenantId: context.tenantContext.tenantId, userId: context.user.userId };
}

function enrichWithScopeMetadata(roles: readonly unknown[]): unknown[] {
  return roles.map((role) => {
    const r = role as { id: string; code: string; name: string; description: string | null; isActive: boolean; permissions: unknown[] };
    const scopeMeta = getRoleScopeMetadata(r.code);
    return {
      ...r,
      scopeType: scopeMeta?.scopeType ?? "TENANT",
      requiresScope: scopeMeta?.requiresScope ?? false,
    };
  });
}

export function createRoleRouteServices(): RoleRouteServices {
  return {
    authorize,
    listRoles: async (tenantId) => {
      const roles = await roleService.listRoles({ tenantId });
      return enrichWithScopeMetadata(roles);
    },
    getRole: async (tenantId, roleId) => {
      const role = await roleService.getRole({ tenantId, roleId });
      if (role === null) return null;
      return enrichWithScopeMetadata([role])[0] ?? null;
    },
    updateRole: (tenantId, roleId, input, actorUserId) =>
      roleService.updateRole({ tenantId, roleId, input, actorUserId }),
    deleteRole: (tenantId, roleId, actorUserId) =>
      roleService.deleteRole({ tenantId, roleId, actorUserId }),
  };
}
