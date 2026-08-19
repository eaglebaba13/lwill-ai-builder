import { handleCreateCustomer, handleListCustomers } from "@/lib/crm/customer-route-handlers";
import { createCustomerRouteServices } from "@/lib/crm/customer-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListCustomers(request, createCustomerRouteServices());
}

export async function POST(request: Request): Promise<Response> {
  return handleCreateCustomer(request, createCustomerRouteServices());
}
