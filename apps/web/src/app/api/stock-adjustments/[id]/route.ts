import { handleGetStockAdjustment } from "@/lib/crm/stock-adjustment-route-handlers";
import { createStockAdjustmentRouteServices } from "@/lib/crm/stock-adjustment-runtime";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleGetStockAdjustment(_request, createStockAdjustmentRouteServices(), id);
}
