import { handleListFollowups, handleCreateFollowup } from "@/lib/crm/followup-route-handlers";
import { createFollowupRouteServices } from "@/lib/crm/followup-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListFollowups(request, createFollowupRouteServices());
}

export async function POST(request: Request): Promise<Response> {
  return handleCreateFollowup(request, createFollowupRouteServices());
}
