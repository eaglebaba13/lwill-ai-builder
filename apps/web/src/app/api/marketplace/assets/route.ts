import { handleListMarketplaceAssets, handleCreateMarketplaceAsset } from "@/lib/crm/marketplace-route-handlers";
import { createMarketplaceRouteServices } from "@/lib/crm/marketplace-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListMarketplaceAssets(request, createMarketplaceRouteServices());
}

export async function POST(request: Request): Promise<Response> {
  return handleCreateMarketplaceAsset(request, createMarketplaceRouteServices());
}
