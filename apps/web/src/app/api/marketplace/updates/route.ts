import { handleGetAvailableUpdates } from "@/lib/crm/marketplace-route-handlers";
import { createMarketplaceRouteServices } from "@/lib/crm/marketplace-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleGetAvailableUpdates(request, createMarketplaceRouteServices());
}
