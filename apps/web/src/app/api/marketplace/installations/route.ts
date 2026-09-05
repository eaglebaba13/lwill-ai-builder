import { handleListTenantInstallations, handleInstallAsset } from "@/lib/crm/marketplace-route-handlers";
import { createMarketplaceRouteServices } from "@/lib/crm/marketplace-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListTenantInstallations(request, createMarketplaceRouteServices());
}

export async function POST(request: Request): Promise<Response> {
  return handleInstallAsset(request, createMarketplaceRouteServices());
}
