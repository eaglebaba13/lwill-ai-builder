import { handleGetPendingFollowups } from "@/lib/crm/crm-report-route-handlers";
import { createCrmReportRouteServices } from "@/lib/crm/crm-report-runtime";
export const runtime = "nodejs";
export async function GET(request: Request) { return handleGetPendingFollowups(request, createCrmReportRouteServices()); }
