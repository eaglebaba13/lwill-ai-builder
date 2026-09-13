import { handleGetCommunication } from "@/lib/crm/communication-route-handlers";
import { createCommunicationRouteServices } from "@/lib/crm/communication-runtime";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleGetCommunication(_request, createCommunicationRouteServices(), id);
}
