import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createServiceService } from "../../../../../packages/authentication-context-prisma/src/service-service";
import type {
  ServiceAuthorization,
  ServiceRouteServices,
} from "./service-route-handlers";

const serviceService = createServiceService(prisma as never);

const authService = createAuthorizationService({
  loadPermissionGrants,
});

async function authorize(permissionCode: string): Promise<ServiceAuthorization> {
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

export function createServiceRouteServices(): ServiceRouteServices {
  return {
    authorize,
    listServices: (tenantId) => serviceService.listServices({ tenantId }),
    getService: (tenantId, serviceId) => serviceService.getService({ tenantId, serviceId }),
    createService: (tenantId, input) => serviceService.createService({ tenantId, ...input }),
    updateService: (tenantId, serviceId, input) =>
      serviceService.updateService({ tenantId, serviceId, input }),
  };
}
