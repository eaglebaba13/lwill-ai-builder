import { handleGetUser, handleUpdateUser } from "@/lib/crm/user-route-handlers";
import { createUserRouteServices } from "@/lib/crm/user-runtime";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleGetUser(request, createUserRouteServices(), id);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateUser(request, createUserRouteServices(), id);
}
