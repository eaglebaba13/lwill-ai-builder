import { handleListBranchPerformance } from "@/lib/crm/branch-performance-route-handlers";
import { createBranchPerformanceRouteServices } from "@/lib/crm/branch-performance-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListBranchPerformance(request, createBranchPerformanceRouteServices());
}
