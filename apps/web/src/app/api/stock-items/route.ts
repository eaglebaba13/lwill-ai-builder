import { handleCreateStockItem, handleGetStockItem, handleListStockItems } from "@/lib/crm/stock-item-route-handlers";
import { createStockItemRouteServices } from "@/lib/crm/stock-item-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListStockItems(request, createStockItemRouteServices());
}

export async function POST(request: Request): Promise<Response> {
  return handleCreateStockItem(request, createStockItemRouteServices());
}
