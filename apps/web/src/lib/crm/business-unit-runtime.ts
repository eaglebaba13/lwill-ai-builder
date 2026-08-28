import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createBusinessUnitService } from "../../../../../packages/authentication-context-prisma/src/business-unit-service";
import type {
  BusinessUnitAuthorization,
  BusinessUnitRouteServices,
} from "./business-unit-route-handlers";

const businessUnitService = createBusinessUnitService(prisma as never);

const authService = createAuthorizationService({
  loadPermissionGrants,
});

async function authorize(permissionCode: string): Promise<BusinessUnitAuthorization> {
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

export function createBusinessUnitRouteServices(): BusinessUnitRouteServices {
  return {
    authorize,
    listBusinessUnits: (tenantId) => businessUnitService.listBusinessUnits({ tenantId }),
    getBusinessUnit: (tenantId, businessUnitId) => businessUnitService.getBusinessUnit({ tenantId, businessUnitId }),
    createBusinessUnit: (tenantId, input) => businessUnitService.createBusinessUnit({ tenantId, ...input }),
    updateBusinessUnit: (tenantId, businessUnitId, input) =>
      businessUnitService.updateBusinessUnit({ tenantId, businessUnitId, input }),
  };
}
