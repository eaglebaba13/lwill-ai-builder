import { handleGetNotificationProviderConfig, handleUpdateNotificationProviderConfig } from "@/lib/communication/notification-provider-config-route-handlers";
import { createNotificationProviderConfigRouteServices } from "@/lib/communication/notification-provider-config-runtime";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  return handleGetNotificationProviderConfig(request, createNotificationProviderConfigRouteServices(), id);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  return handleUpdateNotificationProviderConfig(request, createNotificationProviderConfigRouteServices(), id);
}
