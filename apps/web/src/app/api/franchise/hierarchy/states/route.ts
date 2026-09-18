import { handleCreateStateFranchise, handleListStateFranchises } from "@/lib/crm/franchise-hierarchy-route-handlers";
import { createFranchiseHierarchyRouteServices } from "@/lib/crm/franchise-hierarchy-runtime";
export const runtime = "nodejs";
export const GET = (request: Request) => handleListStateFranchises(request, createFranchiseHierarchyRouteServices());
export const POST = (request: Request) => handleCreateStateFranchise(request, createFranchiseHierarchyRouteServices());
