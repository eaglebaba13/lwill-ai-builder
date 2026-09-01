import { handleGetPlatformHealth } from "@/lib/platform/platform-route-handlers";
import { createPlatformRouteServices } from "@/lib/platform/platform-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleGetPlatformHealth(request, createPlatformRouteServices());
}
