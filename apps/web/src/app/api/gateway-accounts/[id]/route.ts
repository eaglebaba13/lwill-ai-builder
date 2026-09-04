import { handleDeleteGatewayAccount, handleGetGatewayAccount, handleUpdateGatewayAccount } from "@/lib/crm/gateway-account-route-handlers";
import { createGatewayAccountRouteServices } from "@/lib/crm/gateway-account-runtime";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return handleGetGatewayAccount(request, createGatewayAccountRouteServices(), id);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return handleUpdateGatewayAccount(request, createGatewayAccountRouteServices(), id);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return handleDeleteGatewayAccount(request, createGatewayAccountRouteServices(), id);
}
