import { handleGetSetting, handleUpdateSetting } from "@/lib/crm/setting-route-handlers";
import { createSettingRouteServices } from "@/lib/crm/setting-runtime";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleGetSetting(_request, createSettingRouteServices(), id);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateSetting(request, createSettingRouteServices(), id);
}
