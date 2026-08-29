import { handleGetStockTransfer } from "@/lib/crm/stock-transfer-route-handlers";
import { createStockTransferRouteServices } from "@/lib/crm/stock-transfer-runtime";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleGetStockTransfer(_request, createStockTransferRouteServices(), id);
}
