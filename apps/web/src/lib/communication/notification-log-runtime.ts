import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createNotificationLogService } from "../../../../../packages/authentication-context-prisma/src/notification-log-service";
import type {
  NotificationLogAuthorization,
  NotificationLogRouteServices,
} from "./notification-log-route-handlers";

const notificationLogService = createNotificationLogService(prisma as never);

const authService = createAuthorizationService({
  loadPermissionGrants,
});

async function authorize(permissionCode: string): Promise<NotificationLogAuthorization> {
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

export function createNotificationLogRouteServices(): NotificationLogRouteServices {
  return {
    authorize,
    listNotificationLogs: (tenantId) => notificationLogService.listNotificationLogs({ tenantId }),
    getNotificationLog: (tenantId, logId) => notificationLogService.getNotificationLog({ tenantId, logId }),
    createNotificationLog: (tenantId, input) => notificationLogService.createNotificationLog({ tenantId, ...input }),
  };
}
