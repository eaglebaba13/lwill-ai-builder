import { handleGetNotificationLog } from "@/lib/communication/notification-log-route-handlers";
import { createNotificationLogRouteServices } from "@/lib/communication/notification-log-runtime";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleGetNotificationLog(_request, createNotificationLogRouteServices(), id);
}
