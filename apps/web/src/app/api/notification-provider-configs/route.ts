import { handleCreateNotificationProviderConfig, handleListNotificationProviderConfigs } from "@/lib/communication/notification-provider-config-route-handlers";
import { createNotificationProviderConfigRouteServices } from "@/lib/communication/notification-provider-config-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListNotificationProviderConfigs(request, createNotificationProviderConfigRouteServices());
}

export async function POST(request: Request): Promise<Response> {
  return handleCreateNotificationProviderConfig(request, createNotificationProviderConfigRouteServices());
}
