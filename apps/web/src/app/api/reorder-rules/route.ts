import { handleCreateReorderRule, handleGetReorderRule, handleListReorderRules } from "@/lib/crm/reorder-rule-route-handlers";
import { createReorderRuleRouteServices } from "@/lib/crm/reorder-rule-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListReorderRules(request, createReorderRuleRouteServices());
}

export async function POST(request: Request): Promise<Response> {
  return handleCreateReorderRule(request, createReorderRuleRouteServices());
}
