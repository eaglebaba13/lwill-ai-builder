import { handleListMembershipReport } from "@/lib/crm/membership-report-route-handlers";
import { createMembershipReportRouteServices } from "@/lib/crm/membership-report-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListMembershipReport(request, createMembershipReportRouteServices());
}
