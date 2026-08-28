import { handleCreateBranch, handleGetBranch, handleListBranches } from "@/lib/crm/branch-route-handlers";
import { createBranchRouteServices } from "@/lib/crm/branch-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListBranches(request, createBranchRouteServices());
}

export async function POST(request: Request): Promise<Response> {
  return handleCreateBranch(request, createBranchRouteServices());
}
