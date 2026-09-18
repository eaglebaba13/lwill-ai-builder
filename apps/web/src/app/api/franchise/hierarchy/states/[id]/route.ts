import { handleGetStateFranchise, handleUpdateStateFranchise } from "@/lib/crm/franchise-hierarchy-route-handlers";
import { createFranchiseHierarchyRouteServices } from "@/lib/crm/franchise-hierarchy-runtime";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Context) { return handleGetStateFranchise(request, createFranchiseHierarchyRouteServices(), (await params).id); }
export async function PATCH(request: Request, { params }: Context) { return handleUpdateStateFranchise(request, createFranchiseHierarchyRouteServices(), (await params).id); }
