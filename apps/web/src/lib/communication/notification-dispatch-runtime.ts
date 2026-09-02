import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createNotificationDispatcherService } from "../../../../../packages/authentication-context-prisma/src/notification-dispatcher-service";
import type { NotificationDispatchAuthorization, NotificationDispatchRouteServices } from "./notification-dispatch-route-handlers";

const dispatcherService = createNotificationDispatcherService(prisma as never);

const authService = createAuthorizationService({
  loadPermissionGrants,
});

async function authorize(permissionCode: string): Promise<NotificationDispatchAuthorization> {
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
  return { outcome: "authorized", tenantId: context.tenantContext.tenantId };
}

export function createNotificationDispatchRouteServices(): NotificationDispatchRouteServices {
  return {
    authorize,
    dispatchNotification: (input) => dispatcherService.dispatchNotification(input),
  };
}
