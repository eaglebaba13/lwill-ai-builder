import { handleConvertLead } from "@/lib/crm/lead-route-handlers";
import { createLeadRouteServices } from "@/lib/crm/lead-runtime";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleConvertLead(_request, createLeadRouteServices(), id);
}
