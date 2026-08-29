import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createNotificationTemplateService } from "../../../../../packages/authentication-context-prisma/src/notification-template-service";
import type {
  NotificationTemplateAuthorization,
  NotificationTemplateRouteServices,
} from "./notification-template-route-handlers";

const notificationTemplateService = createNotificationTemplateService(prisma as never);

const authService = createAuthorizationService({
  loadPermissionGrants,
});

async function authorize(permissionCode: string): Promise<NotificationTemplateAuthorization> {
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

export function createNotificationTemplateRouteServices(): NotificationTemplateRouteServices {
  return {
    authorize,
    listNotificationTemplates: (tenantId) => notificationTemplateService.listNotificationTemplates({ tenantId }),
    getNotificationTemplate: (tenantId, templateId) => notificationTemplateService.getNotificationTemplate({ tenantId, templateId }),
    createNotificationTemplate: (tenantId, input) => notificationTemplateService.createNotificationTemplate({ tenantId, ...input }),
    updateNotificationTemplate: (tenantId, templateId, input) =>
      notificationTemplateService.updateNotificationTemplate({ tenantId, templateId, input }),
  };
}
