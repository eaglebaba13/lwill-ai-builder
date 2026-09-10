import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createNotificationProviderConfigService } from "../../../../../packages/authentication-context-prisma/src/notification-provider-config-service";
import type {
  NotificationProviderConfigAuthorization,
  NotificationProviderConfigRouteServices,
} from "./notification-provider-config-route-handlers";

const providerConfigService = createNotificationProviderConfigService(prisma as never);
const authService = createAuthorizationService({ loadPermissionGrants });

async function authorize(permissionCode: string): Promise<NotificationProviderConfigAuthorization> {
  const context = await getAuthenticationContext();
  if (!context.authenticated) return { outcome: "unauthenticated" };
  if (context.tenantContext === null) return { outcome: "forbidden" };
  const decision = await authorizeFromContext(
    context,
    { permissionCode, scope: { kind: "tenant", tenantId: context.tenantContext.tenantId } },
    authService,
  );
  return decision.allowed
    ? { outcome: "authorized", tenantId: context.tenantContext.tenantId }
    : { outcome: "forbidden" };
}

function toPublicDTO(record: unknown): unknown {
  return providerConfigService.toPublicDTO(record as never);
}

export function createNotificationProviderConfigRouteServices(): NotificationProviderConfigRouteServices {
  return {
    authorize,
    listNotificationProviderConfigs: async (tenantId) => {
      const configs = await providerConfigService.listNotificationProviderConfigs({ tenantId });
      return configs.map(toPublicDTO);
    },
    getNotificationProviderConfig: async (tenantId, id) => {
      const configs = await providerConfigService.listNotificationProviderConfigs({ tenantId });
      const record = configs.find((config) => config.id === id);
      return record === undefined ? null : toPublicDTO(record);
    },
    createNotificationProviderConfig: async (tenantId, input) => {
      const record = await providerConfigService.createNotificationProviderConfig({ tenantId, ...input });
      return toPublicDTO(record);
    },
    updateNotificationProviderConfig: async (tenantId, id, input) => {
      const configs = await providerConfigService.listNotificationProviderConfigs({ tenantId });
      const record = configs.find((config) => config.id === id);
      if (record === undefined) return null;
      const updated = await providerConfigService.updateNotificationProviderConfig({ tenantId, channel: record.channel, input });
      return updated === null ? null : toPublicDTO(updated);
    },
  };
}
