import { handleListUsers } from "@/lib/crm/user-route-handlers";
import { createUserRouteServices } from "@/lib/crm/user-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListUsers(request, createUserRouteServices());
}
