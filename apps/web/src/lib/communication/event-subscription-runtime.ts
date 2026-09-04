import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createEventSubscriptionService } from "../../../../../packages/authentication-context-prisma/src/event-subscription-service";
import type {
  EventSubscriptionAuthorization,
  EventSubscriptionRouteServices,
} from "./event-subscription-route-handlers";

const eventSubscriptionService = createEventSubscriptionService(prisma as never);

const authService = createAuthorizationService({
  loadPermissionGrants,
});

async function authorize(permissionCode: string): Promise<EventSubscriptionAuthorization> {
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

export function createEventSubscriptionRouteServices(): EventSubscriptionRouteServices {
  return {
    authorize,
    listEventSubscriptions: (tenantId, eventType) =>
      eventSubscriptionService.listEventSubscriptions({ tenantId, eventType }),
    getEventSubscription: (tenantId, subscriptionId) =>
      eventSubscriptionService.getEventSubscription({ tenantId, subscriptionId }),
    createEventSubscription: (tenantId, input) =>
      eventSubscriptionService.createEventSubscription({ tenantId, ...input }),
    updateEventSubscription: (tenantId, subscriptionId, input) =>
      eventSubscriptionService.updateEventSubscription({ tenantId, subscriptionId, input }),
    deleteEventSubscription: (tenantId, subscriptionId) =>
      eventSubscriptionService.deleteEventSubscription({ tenantId, subscriptionId }),
  };
}
