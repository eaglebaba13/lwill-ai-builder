import { handleGetGstSummary } from "@/lib/crm/gst-summary-route-handlers";
import { createGstSummaryRouteServices } from "@/lib/crm/gst-summary-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleGetGstSummary(request, createGstSummaryRouteServices());
}
