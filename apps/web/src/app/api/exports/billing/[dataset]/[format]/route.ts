import { handleBillingExport, type BillingExportDataset, type BillingExportFormat } from "@/lib/x-nail/billing-export-route-handlers";
import { createBillingExportServices } from "@/lib/x-nail/billing-export-runtime";

export const runtime = "nodejs";

const DATASETS = new Set<BillingExportDataset>(["invoices", "payments"]);
const FORMATS = new Set<BillingExportFormat>(["xlsx", "pdf"]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ dataset: string; format: string }> },
): Promise<Response> {
  const { dataset, format } = await params;
  if (!DATASETS.has(dataset as BillingExportDataset) || !FORMATS.has(format as BillingExportFormat)) {
    return Response.json({ error: "Unsupported billing export." }, { status: 404 });
  }
  return handleBillingExport(
    createBillingExportServices(),
    dataset as BillingExportDataset,
    format as BillingExportFormat,
  );
}
