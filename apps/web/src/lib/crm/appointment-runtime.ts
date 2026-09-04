import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createAppointmentService } from "../../../../../packages/authentication-context-prisma/src/appointment-service";
import { createAppointmentEventEmitter } from "../../../../../packages/authentication-context-prisma/src/appointment-event-emitter";
import { createDomainEventBus } from "../../../../../packages/authentication-context-prisma/src/domain-event-bus";
import { createNotificationEventHandler } from "../../../../../packages/authentication-context-prisma/src/notification-event-handler";
import { createEventSubscriptionService } from "../../../../../packages/authentication-context-prisma/src/event-subscription-service";
import { createNotificationDispatcherService } from "../../../../../packages/authentication-context-prisma/src/notification-dispatcher-service";
import type {
  AppointmentAuthorization,
  AppointmentRouteServices,
} from "./appointment-route-handlers";

const baseAppointmentService = createAppointmentService(prisma as never);

const eventBus = createDomainEventBus();
const subscriptionService = createEventSubscriptionService(prisma as never);
const dispatcherService = createNotificationDispatcherService(prisma as never);

const notificationHandler = createNotificationEventHandler({
  subscriptionService,
  dispatcher: dispatcherService,
});
eventBus.subscribe("appointment.created", notificationHandler);

const appointmentService = createAppointmentEventEmitter(baseAppointmentService, eventBus);

const authService = createAuthorizationService({
  loadPermissionGrants,
});

async function authorize(permissionCode: string): Promise<AppointmentAuthorization> {
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
  return { outcome: "authorized", tenantId: context.tenantContext.tenantId, branchId: context.tenantContext.branchId };
}

export function createAppointmentRouteServices(): AppointmentRouteServices {
  return {
    authorize,
    listAppointments: (tenantId) => appointmentService.listAppointments({ tenantId }),
    getAppointment: (tenantId, appointmentId) =>
      appointmentService.getAppointment({ tenantId, appointmentId }),
    createAppointment: (tenantId, branchId, input) =>
      appointmentService.createAppointment({ tenantId, branchId, ...input }),
    updateAppointment: (tenantId, appointmentId, input) =>
      appointmentService.updateAppointment({ tenantId, appointmentId, input }),
  };
}
