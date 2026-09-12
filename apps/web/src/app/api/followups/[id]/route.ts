import { handleGetFollowup, handleUpdateFollowup } from "@/lib/crm/followup-route-handlers";
import { createFollowupRouteServices } from "@/lib/crm/followup-runtime";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleGetFollowup(_request, createFollowupRouteServices(), id);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateFollowup(request, createFollowupRouteServices(), id);
}
