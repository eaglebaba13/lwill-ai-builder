import { handleCreateSupplier, handleGetSupplier, handleListSuppliers } from "@/lib/crm/supplier-route-handlers";
import { createSupplierRouteServices } from "@/lib/crm/supplier-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListSuppliers(request, createSupplierRouteServices());
}

export async function POST(request: Request): Promise<Response> {
  return handleCreateSupplier(request, createSupplierRouteServices());
}
