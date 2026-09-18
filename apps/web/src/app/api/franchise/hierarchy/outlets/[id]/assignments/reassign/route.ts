import { handleReassignOutlet } from "@/lib/crm/franchise-hierarchy-route-handlers";
import { createFranchiseHierarchyRouteServices } from "@/lib/crm/franchise-hierarchy-runtime";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) { return handleReassignOutlet(request, createFranchiseHierarchyRouteServices(), (await params).id); }
