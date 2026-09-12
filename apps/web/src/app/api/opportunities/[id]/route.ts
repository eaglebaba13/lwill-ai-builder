import { handleGetOpportunity, handleUpdateOpportunity } from "@/lib/crm/opportunity-route-handlers";
import { createOpportunityRouteServices } from "@/lib/crm/opportunity-runtime";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleGetOpportunity(_request, createOpportunityRouteServices(), id);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateOpportunity(request, createOpportunityRouteServices(), id);
}
