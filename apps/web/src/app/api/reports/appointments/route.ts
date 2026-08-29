import { handleListAppointmentReport } from "@/lib/crm/appointment-report-route-handlers";
import { createAppointmentReportRouteServices } from "@/lib/crm/appointment-report-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListAppointmentReport(request, createAppointmentReportRouteServices());
}
