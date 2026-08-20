import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createCustomerService } from "../../../../../packages/authentication-context-prisma/src/customer-service";
import type {
  CustomerAuthorization,
  CustomerRouteServices,
} from "./customer-route-handlers";

const customerService = createCustomerService(prisma as never);

const authService = createAuthorizationService({
  loadPermissionGrants,
});

async function authorize(permissionCode: string): Promise<CustomerAuthorization> {
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

export function createCustomerRouteServices(): CustomerRouteServices {
  return {
    authorize,
    listCustomers: (tenantId) => customerService.listCustomers({ tenantId }),
    getCustomer: (tenantId, customerId) => customerService.getCustomer({ tenantId, customerId }),
    createCustomer: (tenantId, input) => customerService.createCustomer({ tenantId, ...input }),
    updateCustomer: (tenantId, customerId, input) =>
      customerService.updateCustomer({ tenantId, customerId, input }),
  };
}
