import { handleCreatePackage, handleListPackages } from "@/lib/crm/package-route-handlers";
import { createPackageRouteServices } from "@/lib/crm/package-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListPackages(request, createPackageRouteServices());
}

export async function POST(request: Request): Promise<Response> {
  return handleCreatePackage(request, createPackageRouteServices());
}
