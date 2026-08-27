import { handleGetMembership } from "@/lib/crm/membership-route-handlers";
import { createMembershipRouteServices } from "@/lib/crm/membership-runtime";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleGetMembership(_request, createMembershipRouteServices(), id);
}
