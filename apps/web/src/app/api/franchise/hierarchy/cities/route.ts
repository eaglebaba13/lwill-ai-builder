import { handleCreateCityFranchise, handleListCityFranchises } from "@/lib/crm/franchise-hierarchy-route-handlers";
import { createFranchiseHierarchyRouteServices } from "@/lib/crm/franchise-hierarchy-runtime";
export const runtime = "nodejs";
export const GET = (request: Request) => handleListCityFranchises(request, createFranchiseHierarchyRouteServices());
export const POST = (request: Request) => handleCreateCityFranchise(request, createFranchiseHierarchyRouteServices());
