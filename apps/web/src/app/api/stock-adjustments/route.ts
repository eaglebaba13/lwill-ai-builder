import { handleCreateStockAdjustment, handleListStockAdjustments } from "@/lib/crm/stock-adjustment-route-handlers";
import { createStockAdjustmentRouteServices } from "@/lib/crm/stock-adjustment-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListStockAdjustments(request, createStockAdjustmentRouteServices());
}

export async function POST(request: Request): Promise<Response> {
  return handleCreateStockAdjustment(request, createStockAdjustmentRouteServices());
}
