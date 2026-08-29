import { handleCreateNotificationLog, handleGetNotificationLog, handleListNotificationLogs } from "@/lib/communication/notification-log-route-handlers";
import { createNotificationLogRouteServices } from "@/lib/communication/notification-log-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListNotificationLogs(request, createNotificationLogRouteServices());
}

export async function POST(request: Request): Promise<Response> {
  return handleCreateNotificationLog(request, createNotificationLogRouteServices());
}
