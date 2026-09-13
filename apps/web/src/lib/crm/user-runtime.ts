import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createUserService } from "../../../../../packages/authentication-context-prisma/src/user-service";
import { createPasswordHash } from "../../../../../packages/authentication-context-prisma/src/auth-persistence";
import type {
  UserAuthorization,
  UserRouteServices,
} from "./user-route-handlers";

const userService = createUserService(prisma as never);

const authService = createAuthorizationService({
  loadPermissionGrants,
});

async function authorize(permissionCode: string): Promise<UserAuthorization> {
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

export function createUserRouteServices(): UserRouteServices {
  return {
    authorize,
    listUsers: (tenantId) => userService.listUsers({ tenantId }),
    getUser: (tenantId, userId) => userService.getUser({ tenantId, userId }),
    createUser: (tenantId, input, actorUserId) =>
      userService.createUser({ tenantId, input, actorUserId, hashPassword: createPasswordHash }),
    updateUser: (tenantId, userId, input, actorUserId) =>
      userService.updateUser({ tenantId, userId, input, actorUserId }),
  };
}
