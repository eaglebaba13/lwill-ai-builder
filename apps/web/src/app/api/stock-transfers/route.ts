import { handleCreateStockTransfer, handleListStockTransfers } from "@/lib/crm/stock-transfer-route-handlers";
import { createStockTransferRouteServices } from "@/lib/crm/stock-transfer-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListStockTransfers(request, createStockTransferRouteServices());
}

export async function POST(request: Request): Promise<Response> {
  return handleCreateStockTransfer(request, createStockTransferRouteServices());
}
