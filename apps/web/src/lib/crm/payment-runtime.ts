import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createPaymentService } from "../../../../../packages/authentication-context-prisma/src/payment-service";
import type {
  PaymentAuthorization,
  PaymentRouteServices,
} from "./payment-route-handlers";

const paymentService = createPaymentService(prisma as never);

const authService = createAuthorizationService({
  loadPermissionGrants,
});

async function authorize(permissionCode: string): Promise<PaymentAuthorization> {
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

export function createPaymentRouteServices(): PaymentRouteServices {
  return {
    authorize,
    createPayment: (tenantId, input) => paymentService.createPayment(tenantId, {
      invoiceId: input.invoiceId,
      amountCents: input.amountCents,
      method: input.method,
      paidAt: input.paidAt ? new Date(input.paidAt) : undefined,
      notes: input.notes,
    }),
    listPaymentsForInvoice: (tenantId, invoiceId) => paymentService.listPaymentsForInvoice(tenantId, invoiceId),
    getPaymentTotal: (tenantId, invoiceId) => paymentService.getPaymentTotal(tenantId, invoiceId),
    getInvoice: async (tenantId, invoiceId) => {
      const invoice = await (prisma as unknown as { invoice: { findUnique: (args: { where: { id: string } }) => Promise<{ id: string; tenantId: string; totalCents: number } | null> } }).invoice.findUnique({ where: { id: invoiceId } });
      if (invoice === null || invoice.tenantId !== tenantId) return null;
      return { totalCents: invoice.totalCents };
    },
  };
}
