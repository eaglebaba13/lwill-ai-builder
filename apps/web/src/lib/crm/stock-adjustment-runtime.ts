import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createStockAdjustmentService } from "../../../../../packages/authentication-context-prisma/src/stock-adjustment-service";
import type {
  StockAdjustmentAuthorization,
  StockAdjustmentRouteServices,
} from "./stock-adjustment-route-handlers";

const stockAdjustmentService = createStockAdjustmentService(prisma as never);

const authService = createAuthorizationService({
  loadPermissionGrants,
});

async function authorize(permissionCode: string): Promise<StockAdjustmentAuthorization> {
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

export function createStockAdjustmentRouteServices(): StockAdjustmentRouteServices {
  return {
    authorize,
    listStockAdjustments: (tenantId) => stockAdjustmentService.listStockAdjustments({ tenantId }),
    getStockAdjustment: (tenantId, stockAdjustmentId) =>
      stockAdjustmentService.getStockAdjustment({ tenantId, stockAdjustmentId }),
    createStockAdjustment: (tenantId, input) =>
      stockAdjustmentService.createStockAdjustment({ tenantId, ...input }),
  };
}
