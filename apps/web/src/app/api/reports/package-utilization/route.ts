import { handleListPackageUtilizationReport } from "@/lib/crm/package-utilization-report-route-handlers";
import { createPackageUtilizationReportRouteServices } from "@/lib/crm/package-utilization-report-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListPackageUtilizationReport(request, createPackageUtilizationReportRouteServices());
}
