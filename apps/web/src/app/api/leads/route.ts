import { handleListLeads, handleCreateLead } from "@/lib/crm/lead-route-handlers";
import { createLeadRouteServices } from "@/lib/crm/lead-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListLeads(request, createLeadRouteServices());
}

export async function POST(request: Request): Promise<Response> {
  return handleCreateLead(request, createLeadRouteServices());
}
