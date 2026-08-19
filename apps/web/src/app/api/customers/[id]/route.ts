import { handleGetCustomer, handleUpdateCustomer } from "@/lib/crm/customer-route-handlers";
import { createCustomerRouteServices } from "@/lib/crm/customer-runtime";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleGetCustomer(request, createCustomerRouteServices(), id);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateCustomer(request, createCustomerRouteServices(), id);
}
