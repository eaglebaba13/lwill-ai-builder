import { handleGetStockMovement } from "@/lib/crm/stock-movement-route-handlers";
import { createStockMovementRouteServices } from "@/lib/crm/stock-movement-runtime";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleGetStockMovement(_request, createStockMovementRouteServices(), id);
}
