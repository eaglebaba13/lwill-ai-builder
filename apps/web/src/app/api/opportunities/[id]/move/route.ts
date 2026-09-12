import { handleMoveOpportunity } from "@/lib/crm/opportunity-route-handlers";
import { createOpportunityRouteServices } from "@/lib/crm/opportunity-runtime";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleMoveOpportunity(request, createOpportunityRouteServices(), id);
}
