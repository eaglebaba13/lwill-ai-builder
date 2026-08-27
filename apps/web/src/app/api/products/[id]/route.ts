import { handleGetProduct, handleUpdateProduct } from "@/lib/crm/product-route-handlers";
import { createProductRouteServices } from "@/lib/crm/product-runtime";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleGetProduct(_request, createProductRouteServices(), id);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateProduct(request, createProductRouteServices(), id);
}
