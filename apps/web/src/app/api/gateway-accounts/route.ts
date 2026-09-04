import { handleCreateGatewayAccount, handleListGatewayAccounts } from "@/lib/crm/gateway-account-route-handlers";
import { createGatewayAccountRouteServices } from "@/lib/crm/gateway-account-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListGatewayAccounts(request, createGatewayAccountRouteServices());
}

export async function POST(request: Request): Promise<Response> {
  return handleCreateGatewayAccount(request, createGatewayAccountRouteServices());
}
