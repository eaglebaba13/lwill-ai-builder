import { handleGetCityFranchise, handleUpdateCityFranchise } from "@/lib/crm/franchise-hierarchy-route-handlers";
import { createFranchiseHierarchyRouteServices } from "@/lib/crm/franchise-hierarchy-runtime";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Context) { return handleGetCityFranchise(request, createFranchiseHierarchyRouteServices(), (await params).id); }
export async function PATCH(request: Request, { params }: Context) { return handleUpdateCityFranchise(request, createFranchiseHierarchyRouteServices(), (await params).id); }
