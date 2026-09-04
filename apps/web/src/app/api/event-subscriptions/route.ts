import { handleCreateEventSubscription, handleListEventSubscriptions } from "@/lib/communication/event-subscription-route-handlers";
import { createEventSubscriptionRouteServices } from "@/lib/communication/event-subscription-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListEventSubscriptions(request, createEventSubscriptionRouteServices());
}

export async function POST(request: Request): Promise<Response> {
  return handleCreateEventSubscription(request, createEventSubscriptionRouteServices());
}
