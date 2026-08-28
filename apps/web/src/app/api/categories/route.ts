import { handleCreateCategory, handleGetCategory, handleListCategories, handleUpdateCategory } from "@/lib/crm/category-route-handlers";
import { createCategoryRouteServices } from "@/lib/crm/category-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListCategories(request, createCategoryRouteServices());
}

export async function POST(request: Request): Promise<Response> {
  return handleCreateCategory(request, createCategoryRouteServices());
}
