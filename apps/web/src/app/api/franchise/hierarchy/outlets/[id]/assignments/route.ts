import { handleAssignOutlet, handleListOutletAssignments } from "@/lib/crm/franchise-hierarchy-route-handlers";
import { createFranchiseHierarchyRouteServices } from "@/lib/crm/franchise-hierarchy-runtime";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Context) { return handleListOutletAssignments(request, createFranchiseHierarchyRouteServices(), (await params).id); }
export async function POST(request: Request, { params }: Context) { return handleAssignOutlet(request, createFranchiseHierarchyRouteServices(), (await params).id); }
