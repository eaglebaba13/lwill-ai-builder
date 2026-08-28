import { handleAssignRole, handleRemoveRole } from "@/lib/crm/membership-role-route-handlers";
import { createMembershipRoleRouteServices } from "@/lib/crm/membership-role-runtime";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return handleAssignRole(request, createMembershipRoleRouteServices());
}

export async function DELETE(request: Request): Promise<Response> {
  return handleRemoveRole(request, createMembershipRoleRouteServices());
}
