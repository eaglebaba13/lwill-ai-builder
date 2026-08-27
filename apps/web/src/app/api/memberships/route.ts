import { handleCreateMembership, handleListMemberships } from "@/lib/crm/membership-route-handlers";
import { createMembershipRouteServices } from "@/lib/crm/membership-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListMemberships(request, createMembershipRouteServices());
}

export async function POST(request: Request): Promise<Response> {
  return handleCreateMembership(request, createMembershipRouteServices());
}
