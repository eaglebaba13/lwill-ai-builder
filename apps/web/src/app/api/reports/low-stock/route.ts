import { handleGetLowStockItems } from "@/lib/crm/low-stock-route-handlers";
import { createLowStockRouteServices } from "@/lib/crm/low-stock-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleGetLowStockItems(request, createLowStockRouteServices());
}
