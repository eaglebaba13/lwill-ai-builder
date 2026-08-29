import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createPurchaseReceiptService } from "../../../../../packages/authentication-context-prisma/src/purchase-receipt-service";
import type {
  PurchaseReceiptAuthorization,
  PurchaseReceiptRouteServices,
} from "./purchase-receipt-route-handlers";

const purchaseReceiptService = createPurchaseReceiptService(prisma as never);

const authService = createAuthorizationService({
  loadPermissionGrants,
});

async function authorize(permissionCode: string): Promise<PurchaseReceiptAuthorization> {
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

export function createPurchaseReceiptRouteServices(): PurchaseReceiptRouteServices {
  return {
    authorize,
    listPurchaseReceipts: (tenantId) => purchaseReceiptService.listPurchaseReceipts({ tenantId }),
    getPurchaseReceipt: (tenantId, purchaseReceiptId) =>
      purchaseReceiptService.getPurchaseReceipt({ tenantId, purchaseReceiptId }),
    createPurchaseReceipt: (tenantId, input) =>
      purchaseReceiptService.createPurchaseReceipt({ tenantId, ...input }),
  };
}
