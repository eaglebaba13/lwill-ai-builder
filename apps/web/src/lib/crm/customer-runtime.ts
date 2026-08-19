import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { prisma } from "../../../../../packages/database/src/client";
import { createCustomerService } from "../../../../../packages/authentication-context-prisma/src/customer-service";
import type {
  CustomerAuthorization,
  CustomerRouteServices,
} from "./customer-route-handlers";

const customerService = createCustomerService(prisma as never);

async function authorize(): Promise<CustomerAuthorization> {
  const context = await getAuthenticationContext();
  if (!context.authenticated || context.tenantContext === null) {
    return { outcome: "unauthenticated" };
  }

  // Customer permission codes and grants are not present in the approved
  // authorization catalog. Keep this release candidate fail-closed until an
  // approved catalog change supplies the canonical permission contract.
  return { outcome: "forbidden" };
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
