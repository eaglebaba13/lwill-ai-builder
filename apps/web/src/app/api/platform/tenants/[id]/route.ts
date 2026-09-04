import { handleGetTenant, handleUpdateTenant } from "@/lib/platform/tenant-route-handlers";
import { createTenantManagementRouteServices } from "@/lib/platform/tenant-runtime";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return handleGetTenant(request, createTenantManagementRouteServices(), id);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return handleUpdateTenant(request, createTenantManagementRouteServices(), id);
}
