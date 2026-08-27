import { handleCreateStaff, handleListStaff } from "@/lib/crm/staff-route-handlers";
import { createStaffRouteServices } from "@/lib/crm/staff-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListStaff(request, createStaffRouteServices());
}

export async function POST(request: Request): Promise<Response> {
  return handleCreateStaff(request, createStaffRouteServices());
}
