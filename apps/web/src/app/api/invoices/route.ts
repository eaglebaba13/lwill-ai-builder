import { handleCreateInvoice, handleListInvoices } from "@/lib/crm/invoice-route-handlers";
import { createInvoiceRouteServices } from "@/lib/crm/invoice-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListInvoices(request, createInvoiceRouteServices());
}

export async function POST(request: Request): Promise<Response> {
  return handleCreateInvoice(request, createInvoiceRouteServices());
}
