import { handleGetFranchiseOverview } from "@/lib/crm/report-route-handlers";
import { createReportRouteServices } from "@/lib/crm/report-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleGetFranchiseOverview(request, createReportRouteServices());
}
