import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createStockService } from "../../../../../packages/authentication-context-prisma/src/stock-service";
import type {
  StockMovementAuthorization,
  StockMovementRouteServices,
} from "./stock-movement-route-handlers";

const stockService = createStockService(prisma as never);

const authService = createAuthorizationService({
  loadPermissionGrants,
});

async function authorize(permissionCode: string): Promise<StockMovementAuthorization> {
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

export function createStockMovementRouteServices(): StockMovementRouteServices {
  return {
    authorize,
    listStockMovements: (tenantId) => stockService.listStockMovements({ tenantId }),
    getStockMovement: (tenantId, stockMovementId) =>
      stockService.getStockMovement({ tenantId, stockMovementId }),
    createStockMovement: (tenantId, input) => stockService.recordStockMovement({ tenantId, ...input }),
  };
}
