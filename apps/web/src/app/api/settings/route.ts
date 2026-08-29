import { handleCreateSetting, handleGetSetting, handleListSettings, handleUpdateSetting } from "@/lib/crm/setting-route-handlers";
import { createSettingRouteServices } from "@/lib/crm/setting-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListSettings(request, createSettingRouteServices());
}

export async function POST(request: Request): Promise<Response> {
  return handleCreateSetting(request, createSettingRouteServices());
}
