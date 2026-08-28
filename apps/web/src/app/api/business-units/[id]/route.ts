import { handleGetBusinessUnit, handleUpdateBusinessUnit } from "@/lib/crm/business-unit-route-handlers";
import { createBusinessUnitRouteServices } from "@/lib/crm/business-unit-runtime";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleGetBusinessUnit(_request, createBusinessUnitRouteServices(), id);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateBusinessUnit(request, createBusinessUnitRouteServices(), id);
}
