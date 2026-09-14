import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createSettlementService } from "../../../../../packages/authentication-context-prisma/src/franchise-settlement-service";
import type { SettlementAuthorization, SettlementRouteServices } from "./settlement-route-handlers";

const settlementService = createSettlementService(prisma as never);
const authService = createAuthorizationService({ loadPermissionGrants });

async function authorize(permissionCode: string): Promise<SettlementAuthorization> {
  const context = await getAuthenticationContext();
  if (!context.authenticated) return { outcome: "unauthenticated" };
  if (context.tenantContext === null) return { outcome: "forbidden" };
  const decision = await authorizeFromContext(context, { permissionCode, scope: { kind: "tenant", tenantId: context.tenantContext.tenantId } }, authService);
  if (!decision.allowed) return { outcome: "forbidden" };
  return { outcome: "authorized", tenantId: context.tenantContext.tenantId, userId: context.user.userId };
}

export function createSettlementRouteServices(): SettlementRouteServices {
  return {
    authorize,
    generateSettlement: (tenantId, input, userId) => settlementService.generateSettlement({ tenantId, input, userId }),
    getSettlement: (tenantId, settlementId) => settlementService.getSettlement({ tenantId, settlementId }),
    listSettlements: (tenantId, filters) => settlementService.listSettlements({ tenantId, ...filters }),
    approveSettlement: (tenantId, settlementId, userId) => settlementService.approveSettlement({ tenantId, settlementId, userId }),
  };
}
