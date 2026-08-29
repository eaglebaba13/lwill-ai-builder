import { handleGetPurchaseReceipt } from "@/lib/crm/purchase-receipt-route-handlers";
import { createPurchaseReceiptRouteServices } from "@/lib/crm/purchase-receipt-runtime";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleGetPurchaseReceipt(_request, createPurchaseReceiptRouteServices(), id);
}
