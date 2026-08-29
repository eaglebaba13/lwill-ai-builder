import { handleGetWarehouse, handleUpdateWarehouse } from "@/lib/crm/warehouse-route-handlers";
import { createWarehouseRouteServices } from "@/lib/crm/warehouse-runtime";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleGetWarehouse(_request, createWarehouseRouteServices(), id);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateWarehouse(request, createWarehouseRouteServices(), id);
}
