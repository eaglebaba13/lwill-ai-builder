import { handleGetNotificationTemplate, handleUpdateNotificationTemplate } from "@/lib/communication/notification-template-route-handlers";
import { createNotificationTemplateRouteServices } from "@/lib/communication/notification-template-runtime";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleGetNotificationTemplate(_request, createNotificationTemplateRouteServices(), id);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateNotificationTemplate(request, createNotificationTemplateRouteServices(), id);
}
