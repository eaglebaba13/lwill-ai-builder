import { handleGetReorderRule, handleUpdateReorderRule } from "@/lib/crm/reorder-rule-route-handlers";
import { createReorderRuleRouteServices } from "@/lib/crm/reorder-rule-runtime";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleGetReorderRule(_request, createReorderRuleRouteServices(), id);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateReorderRule(request, createReorderRuleRouteServices(), id);
}
