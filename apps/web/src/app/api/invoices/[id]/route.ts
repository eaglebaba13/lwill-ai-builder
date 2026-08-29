import { handleGetInvoice, handleUpdateInvoice } from "@/lib/crm/invoice-route-handlers";
import { createInvoiceRouteServices } from "@/lib/crm/invoice-runtime";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleGetInvoice(_request, createInvoiceRouteServices(), id);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateInvoice(request, createInvoiceRouteServices(), id);
}
