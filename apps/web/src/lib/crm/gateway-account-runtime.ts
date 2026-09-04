import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createGatewayAccountService } from "../../../../../packages/authentication-context-prisma/src/gateway-account-service";
import type {
  GatewayAccountAuthorization,
  GatewayAccountRouteServices,
} from "./gateway-account-route-handlers";

const gatewayAccountService = createGatewayAccountService(prisma as never);

const authService = createAuthorizationService({
  loadPermissionGrants,
});

async function authorize(permissionCode: string): Promise<GatewayAccountAuthorization> {
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

export function createGatewayAccountRouteServices(): GatewayAccountRouteServices {
  return {
    authorize,
    listGatewayAccounts: (tenantId) => gatewayAccountService.listGatewayAccounts(tenantId),
    getGatewayAccount: (tenantId, accountId) => gatewayAccountService.getGatewayAccount(tenantId, accountId),
    createGatewayAccount: (tenantId, input) => gatewayAccountService.createGatewayAccount(tenantId, input),
    updateGatewayAccount: (tenantId, accountId, input) => gatewayAccountService.updateGatewayAccount(tenantId, accountId, input),
    deleteGatewayAccount: (tenantId, accountId) => gatewayAccountService.deleteGatewayAccount(tenantId, accountId),
  };
}
