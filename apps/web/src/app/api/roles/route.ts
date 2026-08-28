import { handleListRoles } from "@/lib/crm/role-route-handlers";
import { createRoleRouteServices } from "@/lib/crm/role-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListRoles(request, createRoleRouteServices());
}
