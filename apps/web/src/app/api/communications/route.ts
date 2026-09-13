import { handleListCommunications, handleCreateCommunication } from "@/lib/crm/communication-route-handlers";
import { createCommunicationRouteServices } from "@/lib/crm/communication-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListCommunications(request, createCommunicationRouteServices());
}

export async function POST(request: Request): Promise<Response> {
  return handleCreateCommunication(request, createCommunicationRouteServices());
}
