import { handleCreateWarehouse, handleGetWarehouse, handleListWarehouses } from "@/lib/crm/warehouse-route-handlers";
import { createWarehouseRouteServices } from "@/lib/crm/warehouse-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListWarehouses(request, createWarehouseRouteServices());
}

export async function POST(request: Request): Promise<Response> {
  return handleCreateWarehouse(request, createWarehouseRouteServices());
}
