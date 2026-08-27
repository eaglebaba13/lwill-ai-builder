import { handleGetPackage, handleUpdatePackage } from "@/lib/crm/package-route-handlers";
import { createPackageRouteServices } from "@/lib/crm/package-runtime";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleGetPackage(request, createPackageRouteServices(), id);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdatePackage(request, createPackageRouteServices(), id);
}
