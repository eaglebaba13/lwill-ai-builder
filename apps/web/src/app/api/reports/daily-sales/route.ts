import { handleListDailySales } from "@/lib/crm/daily-sales-route-handlers";
import { createDailySalesRouteServices } from "@/lib/crm/daily-sales-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListDailySales(request, createDailySalesRouteServices());
}
