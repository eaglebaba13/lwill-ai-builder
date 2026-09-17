import "server-only";
import { createInvoiceRouteServices } from "@/lib/crm/invoice-runtime";
import { createPaymentRouteServices } from "@/lib/crm/payment-runtime";
import type { BillingExportInvoice, BillingExportPayment } from "./billing-export";
import type { BillingExportServices } from "./billing-export-route-handlers";

type InvoiceReadRecord = {
  readonly id: string;
  readonly customerId: string;
  readonly branchId?: string | null;
  readonly issuedAt: Date | string;
  readonly subtotalCents: number;
  readonly discountCents: number;
  readonly gstCents: number;
  readonly totalCents: number;
  readonly notes: string | null;
};

type PaymentReadRecord = {
  readonly id: string;
  readonly invoiceId: string;
  readonly amountCents: number;
  readonly method: string;
  readonly paidAt: Date | string;
  readonly notes: string | null;
};

export function createBillingExportServices(): BillingExportServices {
  const invoices = createInvoiceRouteServices();
  const payments = createPaymentRouteServices();

  return {
    authorize: async () => {
      const result = await invoices.authorize("invoice.read");
      if (result.outcome !== "authorized") return result;
      return { outcome: "authorized", tenantId: result.tenantId };
    },
    listBillingData: async (tenantId) => {
      const invoiceRecords = await invoices.listInvoices(tenantId) as readonly InvoiceReadRecord[];
      return Promise.all(invoiceRecords.map(async (invoice): Promise<BillingExportInvoice> => {
        const paymentRecords = await payments.listPaymentsForInvoice(tenantId, invoice.id) as readonly PaymentReadRecord[];
        return {
          id: invoice.id,
          customerId: invoice.customerId,
          branchId: invoice.branchId ?? null,
          issuedAt: new Date(invoice.issuedAt).toISOString(),
          subtotalCents: invoice.subtotalCents,
          discountCents: invoice.discountCents,
          gstCents: invoice.gstCents,
          totalCents: invoice.totalCents,
          notes: invoice.notes,
          payments: paymentRecords.map((payment): BillingExportPayment => ({
            id: payment.id,
            invoiceId: payment.invoiceId,
            amountCents: payment.amountCents,
            method: payment.method,
            paidAt: new Date(payment.paidAt).toISOString(),
            notes: payment.notes,
          })),
        };
      }));
    },
  };
}
