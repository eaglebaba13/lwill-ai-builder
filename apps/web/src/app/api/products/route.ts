import { handleCreateProduct, handleListProducts } from "@/lib/crm/product-route-handlers";
import { createProductRouteServices } from "@/lib/crm/product-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListProducts(request, createProductRouteServices());
}

export async function POST(request: Request): Promise<Response> {
  return handleCreateProduct(request, createProductRouteServices());
}
