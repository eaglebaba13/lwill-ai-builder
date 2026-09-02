import { handleDispatchNotification } from "@/lib/communication/notification-dispatch-route-handlers";
import { createNotificationDispatchRouteServices } from "@/lib/communication/notification-dispatch-runtime";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return handleDispatchNotification(request, createNotificationDispatchRouteServices());
}
