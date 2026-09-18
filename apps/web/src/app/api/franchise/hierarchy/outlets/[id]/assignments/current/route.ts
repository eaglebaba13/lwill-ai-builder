import { handleGetCurrentOutletAssignment } from "@/lib/crm/franchise-hierarchy-route-handlers";
import { createFranchiseHierarchyRouteServices } from "@/lib/crm/franchise-hierarchy-runtime";
export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) { return handleGetCurrentOutletAssignment(request, createFranchiseHierarchyRouteServices(), (await params).id); }
