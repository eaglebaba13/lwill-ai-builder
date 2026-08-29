import { handleGetAttendance, handleUpdateAttendance } from "@/lib/crm/attendance-route-handlers";
import { createAttendanceRouteServices } from "@/lib/crm/attendance-runtime";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleGetAttendance(_request, createAttendanceRouteServices(), id);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateAttendance(request, createAttendanceRouteServices(), id);
}
