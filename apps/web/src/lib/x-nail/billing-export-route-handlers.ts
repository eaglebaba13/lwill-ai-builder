import {
  createInvoicePdf,
  createInvoiceWorkbook,
  createPaymentPdf,
  createPaymentWorkbook,
  type BillingExportInvoice,
} from "./billing-export";

export type BillingExportAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string };

export type BillingExportDataset = "invoices" | "payments";
export type BillingExportFormat = "xlsx" | "pdf";

export interface BillingExportServices {
  readonly authorize: () => Promise<BillingExportAuthorization>;
  readonly listBillingData: (tenantId: string) => Promise<readonly BillingExportInvoice[]>;
}

function dateStamp(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function handleBillingExport(
  services: BillingExportServices,
  dataset: BillingExportDataset,
  format: BillingExportFormat,
  generatedAt = new Date(),
): Promise<Response> {
  const authorization = await services.authorize();
  if (authorization.outcome === "unauthenticated") {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }
  if (authorization.outcome === "forbidden") {
    return Response.json({ error: "Permission denied." }, { status: 403 });
  }

  const invoices = await services.listBillingData(authorization.tenantId);
  const isExcel = format === "xlsx";
  const body = dataset === "invoices"
    ? isExcel
      ? await createInvoiceWorkbook(invoices)
      : await createInvoicePdf(invoices, generatedAt)
    : isExcel
      ? await createPaymentWorkbook(invoices)
      : await createPaymentPdf(invoices, generatedAt);
  const label = dataset === "invoices" ? "Invoices" : "Payments";
  const filename = `X-Nail-${label}-${dateStamp(generatedAt)}.${format}`;

  const responseBody = new ArrayBuffer(body.byteLength);
  new Uint8Array(responseBody).set(body);

  return new Response(responseBody, {
    status: 200,
    headers: {
      "content-type": isExcel
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "application/pdf",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
