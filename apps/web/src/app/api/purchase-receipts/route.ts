import { handleCreatePurchaseReceipt, handleListPurchaseReceipts } from "@/lib/crm/purchase-receipt-route-handlers";
import { createPurchaseReceiptRouteServices } from "@/lib/crm/purchase-receipt-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListPurchaseReceipts(request, createPurchaseReceiptRouteServices());
}

export async function POST(request: Request): Promise<Response> {
  return handleCreatePurchaseReceipt(request, createPurchaseReceiptRouteServices());
}
