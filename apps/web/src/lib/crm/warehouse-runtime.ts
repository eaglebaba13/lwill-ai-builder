import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createWarehouseService } from "../../../../../packages/authentication-context-prisma/src/warehouse-service";
import type {
  WarehouseAuthorization,
  WarehouseRouteServices,
} from "./warehouse-route-handlers";

const warehouseService = createWarehouseService(prisma as never);

const authService = createAuthorizationService({
  loadPermissionGrants,
});

async function authorize(permissionCode: string): Promise<WarehouseAuthorization> {
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

export function createWarehouseRouteServices(): WarehouseRouteServices {
  return {
    authorize,
    listWarehouses: (tenantId) => warehouseService.listWarehouses({ tenantId }),
    getWarehouse: (tenantId, warehouseId) =>
      warehouseService.getWarehouse({ tenantId, warehouseId }),
    createWarehouse: (tenantId, input) => warehouseService.createWarehouse({ tenantId, ...input }),
    updateWarehouse: (tenantId, warehouseId, input) =>
      warehouseService.updateWarehouse({ tenantId, warehouseId, input }),
  };
}
