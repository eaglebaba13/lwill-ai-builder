import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createStockService } from "../../../../../packages/authentication-context-prisma/src/stock-service";
import type {
  StockItemAuthorization,
  StockItemRouteServices,
} from "./stock-item-route-handlers";

const stockService = createStockService(prisma as never);

const authService = createAuthorizationService({
  loadPermissionGrants,
});

async function authorize(permissionCode: string): Promise<StockItemAuthorization> {
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

export function createStockItemRouteServices(): StockItemRouteServices {
  return {
    authorize,
    listStockItems: (tenantId) => stockService.listStockItems({ tenantId }),
    getStockItem: (tenantId, stockItemId) =>
      stockService.getStockItemById({ tenantId, stockItemId }),
    createStockItem: (tenantId, input) => stockService.createStockItem({ tenantId, ...input }),
    updateStockItem: (tenantId, stockItemId, input) =>
      stockService.updateStockItem({ tenantId, stockItemId, input }),
  };
}
