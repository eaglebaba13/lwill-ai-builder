import { handleGetMarketplaceAsset } from "@/lib/crm/marketplace-route-handlers";
import { createMarketplaceRouteServices } from "@/lib/crm/marketplace-runtime";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  return handleGetMarketplaceAsset(request, createMarketplaceRouteServices(), id);
}
