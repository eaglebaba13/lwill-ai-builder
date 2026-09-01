import { handleGetFranchiseDashboard } from "@/lib/crm/franchise-route-handlers";
import { createFranchiseRouteServices } from "@/lib/crm/franchise-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleGetFranchiseDashboard(request, createFranchiseRouteServices());
}
