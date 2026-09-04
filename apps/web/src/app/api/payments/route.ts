import { handleCreatePayment } from "@/lib/crm/payment-route-handlers";
import { createPaymentRouteServices } from "@/lib/crm/payment-runtime";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return handleCreatePayment(request, createPaymentRouteServices());
}
