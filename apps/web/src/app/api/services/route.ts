import { handleCreateService, handleListServices } from "@/lib/crm/service-route-handlers";
import { createServiceRouteServices } from "@/lib/crm/service-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListServices(request, createServiceRouteServices());
}

export async function POST(request: Request): Promise<Response> {
  return handleCreateService(request, createServiceRouteServices());
}
