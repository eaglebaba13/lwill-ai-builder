import { handleGetSupplier, handleUpdateSupplier } from "@/lib/crm/supplier-route-handlers";
import { createSupplierRouteServices } from "@/lib/crm/supplier-runtime";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleGetSupplier(_request, createSupplierRouteServices(), id);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateSupplier(request, createSupplierRouteServices(), id);
}
