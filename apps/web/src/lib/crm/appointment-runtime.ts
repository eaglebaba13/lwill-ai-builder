import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createAppointmentService } from "../../../../../packages/authentication-context-prisma/src/appointment-service";
import type {
  AppointmentAuthorization,
  AppointmentRouteServices,
} from "./appointment-route-handlers";

const appointmentService = createAppointmentService(prisma as never);

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
