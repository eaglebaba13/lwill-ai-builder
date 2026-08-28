import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createRoleService } from "../../../../../packages/authentication-context-prisma/src/role-service";
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

export function createRoleRouteServices(): RoleRouteServices {
  return {
    authorize,
    listRoles: (tenantId) => roleService.listRoles({ tenantId }),
    getRole: (tenantId, roleId) => roleService.getRole({ tenantId, roleId }),
    updateRole: (tenantId, roleId, input, actorUserId) =>
      roleService.updateRole({ tenantId, roleId, input, actorUserId }),
    deleteRole: (tenantId, roleId, actorUserId) =>
      roleService.deleteRole({ tenantId, roleId, actorUserId }),
  };
}
