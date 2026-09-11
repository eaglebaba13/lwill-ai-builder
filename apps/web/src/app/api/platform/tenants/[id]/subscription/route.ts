import { handleGetSubscription, handleCreateSubscription, handleUpdateSubscription } from "@/lib/platform/subscription-license-route-handlers";
import { createSubscriptionLicenseRouteServices } from "@/lib/platform/subscription-license-runtime";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleGetSubscription(_request, createSubscriptionLicenseRouteServices(), id);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleCreateSubscription(request, createSubscriptionLicenseRouteServices(), id);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateSubscription(request, createSubscriptionLicenseRouteServices(), id);
}
