import { handleCreateBusinessUnit, handleGetBusinessUnit, handleListBusinessUnits } from "@/lib/crm/business-unit-route-handlers";
import { createBusinessUnitRouteServices } from "@/lib/crm/business-unit-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListBusinessUnits(request, createBusinessUnitRouteServices());
}

export async function POST(request: Request): Promise<Response> {
  return handleCreateBusinessUnit(request, createBusinessUnitRouteServices());
}
