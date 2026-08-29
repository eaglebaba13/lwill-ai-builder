import { handleCreateStockMovement, handleGetStockMovement, handleListStockMovements } from "@/lib/crm/stock-movement-route-handlers";
import { createStockMovementRouteServices } from "@/lib/crm/stock-movement-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListStockMovements(request, createStockMovementRouteServices());
}

export async function POST(request: Request): Promise<Response> {
  return handleCreateStockMovement(request, createStockMovementRouteServices());
}
