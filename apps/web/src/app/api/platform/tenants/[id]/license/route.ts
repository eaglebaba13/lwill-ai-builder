import { handleGetLicense, handleCreateLicense, handleUpdateLicense } from "@/lib/platform/subscription-license-route-handlers";
import { createSubscriptionLicenseRouteServices } from "@/lib/platform/subscription-license-runtime";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleGetLicense(_request, createSubscriptionLicenseRouteServices(), id);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleCreateLicense(request, createSubscriptionLicenseRouteServices(), id);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateLicense(request, createSubscriptionLicenseRouteServices(), id);
}
