import { handleGetStockItem, handleListStockItems } from "@/lib/crm/stock-item-route-handlers";
import { createStockItemRouteServices } from "@/lib/crm/stock-item-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListStockItems(request, createStockItemRouteServices());
}
