import { handleListStages, handleCreateStage } from "@/lib/crm/opportunity-route-handlers";
import { createOpportunityRouteServices } from "@/lib/crm/opportunity-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListStages(request, createOpportunityRouteServices());
}

export async function POST(request: Request): Promise<Response> {
  return handleCreateStage(request, createOpportunityRouteServices());
}
