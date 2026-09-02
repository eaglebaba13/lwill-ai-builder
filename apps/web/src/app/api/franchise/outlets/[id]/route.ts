import { handleGetOutlet } from "@/lib/crm/franchise-route-handlers";
import { createFranchiseRouteServices } from "@/lib/crm/franchise-runtime";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return handleGetOutlet(request, createFranchiseRouteServices(), id);
}
