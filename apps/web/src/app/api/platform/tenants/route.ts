import { handleListTenants, handleCreateTenant } from "@/lib/platform/tenant-route-handlers";
import { createTenantManagementRouteServices } from "@/lib/platform/tenant-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListTenants(request, createTenantManagementRouteServices());
}

export async function POST(request: Request): Promise<Response> {
  return handleCreateTenant(request, createTenantManagementRouteServices());
}
