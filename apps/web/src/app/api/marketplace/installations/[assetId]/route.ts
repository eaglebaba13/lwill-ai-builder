import { handleUninstallAsset } from "@/lib/crm/marketplace-route-handlers";
import { createMarketplaceRouteServices } from "@/lib/crm/marketplace-runtime";

export const runtime = "nodejs";

export async function DELETE(request: Request, { params }: { params: Promise<{ assetId: string }> }): Promise<Response> {
  const { assetId } = await params;
  return handleUninstallAsset(request, createMarketplaceRouteServices(), assetId);
}
