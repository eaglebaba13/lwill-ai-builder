import { handleCreateNotificationTemplate, handleGetNotificationTemplate, handleListNotificationTemplates, handleUpdateNotificationTemplate } from "@/lib/communication/notification-template-route-handlers";
import { createNotificationTemplateRouteServices } from "@/lib/communication/notification-template-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListNotificationTemplates(request, createNotificationTemplateRouteServices());
}

export async function POST(request: Request): Promise<Response> {
  return handleCreateNotificationTemplate(request, createNotificationTemplateRouteServices());
}
