import { handleListPipelines, handleCreatePipeline } from "@/lib/crm/opportunity-route-handlers";
import { createOpportunityRouteServices } from "@/lib/crm/opportunity-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListPipelines(request, createOpportunityRouteServices());
}

export async function POST(request: Request): Promise<Response> {
  return handleCreatePipeline(request, createOpportunityRouteServices());
}
