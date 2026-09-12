import { handleGetLead, handleUpdateLead } from "@/lib/crm/lead-route-handlers";
import { createLeadRouteServices } from "@/lib/crm/lead-runtime";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleGetLead(_request, createLeadRouteServices(), id);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateLead(request, createLeadRouteServices(), id);
}
