import { handleGetStaff, handleUpdateStaff } from "@/lib/crm/staff-route-handlers";
import { createStaffRouteServices } from "@/lib/crm/staff-runtime";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return handleGetStaff(_request, createStaffRouteServices(), id);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return handleUpdateStaff(request, createStaffRouteServices(), id);
}
