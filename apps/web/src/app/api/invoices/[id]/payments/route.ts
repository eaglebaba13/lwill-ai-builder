import { handleListPaymentsForInvoice } from "@/lib/crm/payment-route-handlers";
import { createPaymentRouteServices } from "@/lib/crm/payment-runtime";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return handleListPaymentsForInvoice(request, createPaymentRouteServices(), id);
}
