import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createBillingInvoiceService } from "../../../../../packages/authentication-context-prisma/src/invoice-service";
import type {
  InvoiceAuthorization,
  InvoiceRouteServices,
} from "./invoice-route-handlers";

const invoiceService = createBillingInvoiceService(prisma as never);

const authService = createAuthorizationService({
  loadPermissionGrants,
});

async function authorize(permissionCode: string): Promise<InvoiceAuthorization> {
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
  return { outcome: "authorized", tenantId: context.tenantContext.tenantId, branchId: context.tenantContext.branchId, userId: context.user.userId };
}

export function createInvoiceRouteServices(): InvoiceRouteServices {
  return {
    authorize,
    listInvoices: (tenantId) => invoiceService.listInvoices({ tenantId }),
    getInvoice: (tenantId, invoiceId) => invoiceService.getInvoice({ tenantId, invoiceId }),
    createInvoice: (tenantId, branchId, input, actorUserId) => invoiceService.createInvoice({ tenantId, branchId, ...input }, actorUserId),
    updateInvoice: (tenantId, invoiceId, input, actorUserId) => invoiceService.updateInvoice({ tenantId, invoiceId, input, actorUserId }),
  };
}
