import { handleGetCategory, handleUpdateCategory } from "@/lib/crm/category-route-handlers";
import { createCategoryRouteServices } from "@/lib/crm/category-runtime";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleGetCategory(_request, createCategoryRouteServices(), id);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateCategory(request, createCategoryRouteServices(), id);
}
