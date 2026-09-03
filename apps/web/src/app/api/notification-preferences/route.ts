import { handleCreateNotificationPreference, handleListNotificationPreferences, handleUpdateNotificationPreference } from "@/lib/communication/notification-preference-route-handlers";
import { createNotificationPreferenceRouteServices } from "@/lib/communication/notification-preference-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListNotificationPreferences(request, createNotificationPreferenceRouteServices());
}

export async function POST(request: Request): Promise<Response> {
  return handleCreateNotificationPreference(request, createNotificationPreferenceRouteServices());
}

export async function PATCH(request: Request): Promise<Response> {
  return handleUpdateNotificationPreference(request, createNotificationPreferenceRouteServices());
}
