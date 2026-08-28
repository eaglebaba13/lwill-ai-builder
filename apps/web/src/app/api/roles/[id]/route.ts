import {
  handleDeleteRole,
  handleGetRole,
  handleUpdateRole,
} from "@/lib/crm/role-route-handlers";
import { createRoleRouteServices } from "@/lib/crm/role-runtime";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleGetRole(request, createRoleRouteServices(), id);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateRole(request, createRoleRouteServices(), id);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleDeleteRole(request, createRoleRouteServices(), id);
}
