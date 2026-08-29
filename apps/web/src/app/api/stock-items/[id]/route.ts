import { handleGetStockItem, handleUpdateStockItem } from "@/lib/crm/stock-item-route-handlers";
import { createStockItemRouteServices } from "@/lib/crm/stock-item-runtime";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleGetStockItem(_request, createStockItemRouteServices(), id);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateStockItem(request, createStockItemRouteServices(), id);
}
