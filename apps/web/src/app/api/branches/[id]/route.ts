import { handleGetBranch, handleUpdateBranch } from "@/lib/crm/branch-route-handlers";
import { createBranchRouteServices } from "@/lib/crm/branch-runtime";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleGetBranch(_request, createBranchRouteServices(), id);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateBranch(request, createBranchRouteServices(), id);
}
