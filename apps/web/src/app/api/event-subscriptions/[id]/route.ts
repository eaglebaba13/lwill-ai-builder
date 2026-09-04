import { handleDeleteEventSubscription, handleGetEventSubscription, handleUpdateEventSubscription } from "@/lib/communication/event-subscription-route-handlers";
import { createEventSubscriptionRouteServices } from "@/lib/communication/event-subscription-runtime";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  return handleGetEventSubscription(_request, createEventSubscriptionRouteServices(), id);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  return handleUpdateEventSubscription(request, createEventSubscriptionRouteServices(), id);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  return handleDeleteEventSubscription(_request, createEventSubscriptionRouteServices(), id);
}
