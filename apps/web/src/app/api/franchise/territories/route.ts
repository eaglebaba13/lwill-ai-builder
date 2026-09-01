import { handleListTerritories, handleCreateTerritory } from "@/lib/crm/franchise-route-handlers";
import { createFranchiseRouteServices } from "@/lib/crm/franchise-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListTerritories(request, createFranchiseRouteServices());
}

export async function POST(request: Request): Promise<Response> {
  return handleCreateTerritory(request, createFranchiseRouteServices());
}
