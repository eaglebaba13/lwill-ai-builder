import { handleInventoryExport, type InventoryExportDataset, type InventoryExportFormat } from "@/lib/x-nail/inventory-transfer-route-handlers";
import { createInventoryTransferServices } from "@/lib/x-nail/inventory-transfer-runtime";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ dataset: string; format: string }> }): Promise<Response> {
  const { dataset, format } = await context.params;
  if ((dataset !== "inventory" && dataset !== "purchases") || (format !== "xlsx" && format !== "pdf")) {
    return Response.json({ error: "Unsupported export." }, { status: 404 });
  }
  return handleInventoryExport(createInventoryTransferServices(), dataset as InventoryExportDataset, format as InventoryExportFormat);
}