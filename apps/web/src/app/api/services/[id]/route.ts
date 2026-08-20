import { handleGetService, handleUpdateService } from "@/lib/crm/service-route-handlers";
import { createServiceRouteServices } from "@/lib/crm/service-runtime";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleGetService(request, createServiceRouteServices(), id);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateService(request, createServiceRouteServices(), id);
}
